// IAST (scholarly English) from Devanagari: the 12 reference lines from TRANSLITERATION.md, checked against the
// site's own code (js/text/iast.js). A failure here means a scholarly English line on the site would change.
import { beforeAll, describe, expect, test } from "vitest";

let IA;
beforeAll(async () => {
  // js/render.js sets SCR while the page loads; the Devanagari lines here need no script change
  globalThis.SCR = { from: (t) => t };
  ({ IA } = await import("../../js/text/iast.js"));
});

// [Devanagari line, expected IAST]
const CHECKS = [
  ["सुखकर्ता दुःखहर्ता, वार्ता विघ्नाची ।", "sukhakartā duḥkhahartā, vārtā vighnācī |"],
  ["सर्वांगी सुंदर उटी शेंदुराची ।", "sarvāṅgī sundara uṭī śendurācī |"],
  ["कंठी झळके माळ मुक्ताफळांची ॥", "kaṇṭhī jhaḷake māḷa muktāphaḷāṃcī ||"],
  ["लंबोदर पीतांबर फणिवरबंधना ।", "lambodara pītāmbara phaṇivarabandhanā |"],
  ["पराही परतली तेथे कैंचा हेत ।", "parāhī paratalī tethe kaiṃcā heta |"],
  ["क्लेशांपासुनि सोडवी तोडी भवपाशा ।", "kleśāṃpāsuni soḍavī toḍī bhavapāśā |"],
  ["डोळ्यांनी पाहिन रूप तुझें ।", "ḍoḷyāṃnī pāhina rūpa tujheṃ |"],
  ["ॐ भ॒द्रं कर्णे॑भिः शृणु॒याम॑ देवाः ।", "om̐ bha̱draṃ karṇe̍bhiḥ śṛṇu̱yāma̍ devāḥ |"],
  ["स्थि॒रैरङ्गै᳚स्तुष्टु॒वाग्ं स॑स्त॒नूभिः॑ ।", "sthi̱rairaṅgai̎stuṣṭu̱vāgṃ sa̍sta̱nūbhi̍ḥ |"],
  ["त्वं ज्ञानमयो विज्ञान॑मयो॒ऽसि ॥ ४ ॥", "tvaṃ jñānamayo vijñāna̍mayo̱'si || 4 ||"],
  ["शेंदुर लाल चढ़ायो अच्छा गजमुख को ।", "śendura lāla caṛhāyo acchā gajamukha ko |"],
  ["बाँझन को पुत्र देत, निर्धन को माया ॥", "bām̐jhana ko putra deta, nirdhana ko māyā ||"],
];

describe("IAST", () => {
  test.each(CHECKS)("%s", (dev, iast) => {
    expect(IA(dev)).toBe(iast);
  });
});

// found by the print tests on the newer texts (Shree Rudra, Lalita)
describe("IAST edge letters", () => {
  test("vocalic ḷ: कॢप्तं", () => {
    expect(IA("कॢप्तं")).toBe("kḷptaṃ");
  });
  test("a zero-width joiner before a vowel sign changes nothing: श‍ृङ्ग", () => {
    expect(IA("श‍ृङ्ग")).toBe(IA("शृङ्ग"));
    expect(IA("शृङ्ग")).toBe("śṛṅga");
  });
});
