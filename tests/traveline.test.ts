import { describe, expect, it, vi, afterEach } from "vitest";
import {
  parseOperators,
  fetchNocLines,
} from "../src/functions/traveline.server";

function row(overrides: Record<string, string> = {}) {
  const values = {
    NOCLineNo: "1",
    NOCCODE: "TEST",
    PubNm: "Test buses",
    RefNm: "Test Ltd",
    Licence: "",
    Mode: "Bus",
    Duplicate: "OK",
    DateCeased: "",
    ...overrides,
  };
  return `<NOCLinesRecord>${Object.entries(values)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("")}</NOCLinesRecord>`;
}
const feed = (rows: string) =>
  `<?xml version="1.0"?><travelinedata><Groups><Mode>Bus</Mode></Groups><NOCLines>${rows}</NOCLines><Operators><PubNm>Ignore me</PubNm></Operators></travelinedata>`;

afterEach(() => vi.unstubAllGlobals());

describe("Traveline operator projection", () => {
  it("keeps the first eligible row per NOC code, including source order", () => {
    const xml = feed(
      row({ Mode: "Rail" }) +
        row({ Duplicate: "Dup" }) +
        row({ DateCeased: "2020-01-01" }) +
        row({ NOCLineNo: "4" }) +
        row({ NOCLineNo: "5", PubNm: "Duplicate name" }) +
        row({ NOCLineNo: "6", NOCCODE: "OTHER" }),
    );
    expect(parseOperators(xml)).toEqual([
      {
        lineNo: 4,
        nocCode: "TEST",
        publicName: "Test buses",
        referenceName: "Test Ltd",
        hasMissingLocationData: false,
      },
      {
        lineNo: 6,
        nocCode: "OTHER",
        publicName: "Test buses",
        referenceName: "Test Ltd",
        hasMissingLocationData: false,
      },
    ]);
    // Global regular expressions must not leak their cursor between requests.
    expect(parseOperators(xml)).toHaveLength(2);
  });

  it("decodes XML entities and preserves literal CDATA", () => {
    const [result] = parseOperators(
      feed(
        row({
          PubNm:
            "A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos; &#233; &#x1F68C;",
          RefNm: "Before <![CDATA[A &amp; B]]> after &amp; end",
        }),
      ),
    );
    expect(result.publicName).toBe("A & B <C> \"D\" 'E' é 🚌");
    expect(result.referenceName).toBe("Before A &amp; B after & end");
  });

  it("supports empty elements and whitespace in the export", () => {
    const xml = feed(row())
      .replace("<RefNm>Test Ltd</RefNm>", "<RefNm />")
      .replace("<Licence></Licence>", "<Licence/>")
      .replace("<DateCeased></DateCeased>", "<DateCeased />")
      .replace(/></g, ">\n<");
    expect(parseOperators(xml)[0].referenceName).toBe("");
  });

  it("reads columns by name when their order changes", () => {
    const xml = feed(row())
      .replace("<Mode>Bus</Mode>", "<NewColumn>new data</NewColumn>")
      .replace("<NOCLineNo>", "<Mode>Bus</Mode><NOCLineNo>");
    expect(parseOperators(xml)[0].nocCode).toBe("TEST");
  });

  it("preserves records when XML elements have attributes", () => {
    const xml = feed(row())
      .replace("<NOCLines>", '<NOCLines source="NOC">')
      .replace("<NOCLinesRecord>", '<NOCLinesRecord version="1">')
      .replace("<PubNm>", '<PubNm lang="en">');
    expect(parseOperators(xml)[0].publicName).toBe("Test buses");
  });

  it("normalizes XML line endings", () => {
    expect(
      parseOperators(feed(row({ PubNm: "A\r\nB\rC" })))[0].publicName,
    ).toBe("A\nB\nC");
  });

  it.each([
    "<travelinedata/>",
    feed(row()).replace("</NOCLines>", ""),
    feed(row() + row({ NOCLineNo: "2" }).replace("</NOCLinesRecord>", "")),
    feed(row().replace("<NOCCODE>TEST</NOCCODE>", "")),
    feed(row({ PubNm: "Bad &unknown; entity" })),
    feed(row({ PubNm: "Bad & entity" })),
    feed(row({ PubNm: "Bad &#xD800; entity" })),
  ])(
    "rejects incomplete or invalid feeds before they can remove rows",
    (xml) => {
      expect(() => parseOperators(xml)).toThrow();
    },
  );

  it("rejects HTTP failures instead of treating them as an empty import", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );
    await expect(fetchNocLines()).rejects.toThrow("temporarily unavailable");
  });
});
