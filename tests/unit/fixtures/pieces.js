// The text of every piece, in reading order, grouped as on the home page.
// Each line has the original (mr: Marathi, Hindi or Sanskrit in Devanagari) and its English spelling (en).
// l is the line id used by highlights and print; rf marks a refrain line; kind "rf" is a repeated refrain
// and "dh" a line said once (dhrupad-style opening); rmk is the small "repeat" note between verses.
// prose (a piece): printed in one language it reads as running paragraphs, as in a printed booklet, and
// para marks the stanza each paragraph starts with (a dh stanza is a paragraph of its own).
window.CONTENT = {
 "ui": {
  "prev": {
   "mr": "मागील",
   "en": "Previous"
  },
  "next": {
   "mr": "पुढील",
   "en": "Next"
  }
 },
 // Wikipedia pages in the other scripts' languages, keyed by the Marathi page the credit links to.
 // A credit with no page here links to its English page instead.
 "wiki": {
  "kn": {
   "https://mr.wikipedia.org/wiki/एकनाथ": "https://kn.wikipedia.org/wiki/ಸಂತ_ಏಕನಾಥ್",
   "https://mr.wikipedia.org/wiki/नामदेव": "https://kn.wikipedia.org/wiki/ನಾಮ್‍ದೇವ್",
   "https://mr.wikipedia.org/wiki/समर्थ_रामदास_स्वामी": "https://kn.wikipedia.org/wiki/ಸಮರ್ಥ_ರಾಮದಾಸರು"
  }
 },
 "groups": [
  {
   "id": "g-pooja",
   "btn": "pfb",
   "name": {
    "mr": "पूजा",
    "en": "Pooja"
   },
   "pieces": [
    {
     "id": "p1",
     "lang": "sa",
     "prose": true,
     "no": {
      "mr": "१.",
      "en": "1."
     },
     "title": {
      "mr": "गणपत्यथर्वशीर्षोपनिषत्",
      "en": "Ganapati Atharvashirsha"
     },
     "tag": {
      "mr": "संस्कृत",
      "en": "Sanskrit"
     },
     "items": [
      {
       "kind": "dh",
       "lines": [
        {
         "l": "p1l1",
         "mr": "ॐ भ॒द्रं कर्णे॑भिः शृणु॒याम॑ देवाः ।",
         "en": "Om Bhadram Karnebhih Shrunuyama Devah |"
        },
        {
         "l": "p1l2",
         "mr": "भ॒द्रं प॑श्येमा॒क्षभि॒र्यज॑त्राः ।",
         "en": "Bhadram Pashyemakshabhiryajatrah |"
        },
        {
         "l": "p1l3",
         "mr": "स्थि॒रैरङ्गै᳚स्तुष्टु॒वाग्ं स॑स्त॒नूभिः॑ ।",
         "en": "Sthirairangaistushtuvagm Sastanubhih |"
        },
        {
         "l": "p1l4",
         "mr": "व्यशे॑म दे॒वहि॑तं॒ यदायुः॑ ।",
         "en": "Vyashema Devahitam Yadayuh |"
        },
        {
         "l": "p1l5",
         "mr": "स्व॒स्ति न॒ इन्द्रो॑ वृ॒द्धश्र॑वाः ।",
         "en": "Svasti Na Indro Vruddhashravah |"
        },
        {
         "l": "p1l6",
         "mr": "स्व॒स्ति नः॑ पू॒षा वि॒श्ववे॑दाः ।",
         "en": "Svasti Nah Pusha Vishvavedah |"
        },
        {
         "l": "p1l7",
         "mr": "स्व॒स्ति न॒स्तार्क्ष्यो॒ अरि॑ष्टनेमिः ।",
         "en": "Svasti Nastarkshyo Arishtanemih |"
        },
        {
         "l": "p1l8",
         "mr": "स्व॒स्ति नो॒ बृह॒स्पति॑र्दधातु ॥",
         "en": "Svasti No Bruhaspatirdadhatu ||"
        },
        {
         "l": "p1l9",
         "mr": "ॐ शान्तिः॒ शान्तिः॒ शान्तिः॑ ॥",
         "en": "Om Shantih Shantih Shantih ||"
        }
       ]
      },
      {
       "para": true,
       "lines": [
        {
         "l": "p1l10",
         "mr": "ॐ नम॑स्ते ग॒णप॑तये ।",
         "en": "Om Namaste Ganapataye |"
        },
        {
         "l": "p1l11",
         "mr": "त्वमे॒व प्र॒त्यक्षं॒ तत्त्व॑मसि ।",
         "en": "Tvameva Pratyaksham Tattvamasi |"
        },
        {
         "l": "p1l12",
         "mr": "त्वमे॒व के॒वलं॒ कर्ता॑ऽसि ।",
         "en": "Tvameva Kevalam Kartasi |"
        },
        {
         "l": "p1l13",
         "mr": "त्वमे॒व के॒वलं॒ धर्ता॑ऽसि ।",
         "en": "Tvameva Kevalam Dhartasi |"
        },
        {
         "l": "p1l14",
         "mr": "त्वमे॒व के॒वलं॒ हर्ता॑ऽसि ।",
         "en": "Tvameva Kevalam Hartasi |"
        },
        {
         "l": "p1l15",
         "mr": "त्वमेव सर्वं खल्विदं॑ ब्रह्मा॒सि ।",
         "en": "Tvameva Sarvam Khalvidam Brahmasi |"
        },
        {
         "l": "p1l16",
         "mr": "त्वं साक्षादात्मा॑ऽसि नि॒त्यम् ॥ १ ॥",
         "en": "Tvam Sakshadatmasi Nityam || 1 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l17",
         "mr": "ऋ॑तं व॒च्मि । स॑त्यं व॒च्मि ॥ २ ॥",
         "en": "Rutam Vachmi | Satyam Vachmi || 2 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l18",
         "mr": "अव॒ त्वं॒ माम् । अव॑ व॒क्तार᳚म् ।",
         "en": "Ava Tvam Mam | Ava Vaktaram |"
        },
        {
         "l": "p1l19",
         "mr": "अव॑ श्रो॒तार᳚म् । अव॑ दा॒तार᳚म् ।",
         "en": "Ava Shrotaram | Ava Dataram |"
        },
        {
         "l": "p1l20",
         "mr": "अव॑ धा॒तार᳚म् । अवानूचानम॑व शि॒ष्यम् ।",
         "en": "Ava Dhataram | Avanuchanamava Shishyam |"
        },
        {
         "l": "p1l21",
         "mr": "अव॑ प॒श्चात्ता᳚त् । अव॑ पु॒रस्ता᳚त् ।",
         "en": "Ava Pashchattat | Ava Purastat |"
        },
        {
         "l": "p1l22",
         "mr": "अवोत्त॒रात्ता᳚त् । अव॑ दक्षि॒णात्ता᳚त् ।",
         "en": "Avottarattat | Ava Dakshinattat |"
        },
        {
         "l": "p1l23",
         "mr": "अव॑ चो॒र्ध्वात्ता᳚त् । अवाध॒रात्ता᳚त् ।",
         "en": "Ava Chordhvattat | Avadharattat |"
        },
        {
         "l": "p1l24",
         "mr": "सर्वतो मां पाहि पाहि॑ सम॒न्तात् ॥ ३ ॥",
         "en": "Sarvato Mam Pahi Pahi Samantat || 3 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l25",
         "mr": "त्वं वाङ्मय॑स्त्वं चिन्म॒यः ।",
         "en": "Tvam Vangmayastvam Chinmayah |"
        },
        {
         "l": "p1l26",
         "mr": "त्वमानन्दमय॑स्त्वं ब्रह्म॒मयः ।",
         "en": "Tvamanandamayastvam Brahmamayah |"
        },
        {
         "l": "p1l27",
         "mr": "त्वं सच्चिदानन्दाऽद्वि॑तीयो॒ऽसि ।",
         "en": "Tvam Sachchidanandadvitiyosi |"
        },
        {
         "l": "p1l28",
         "mr": "त्वं प्र॒त्यक्षं॒ ब्रह्मा॑सि ।",
         "en": "Tvam Pratyaksham Brahmasi |"
        },
        {
         "l": "p1l29",
         "mr": "त्वं ज्ञानमयो विज्ञान॑मयो॒ऽसि ॥ ४ ॥",
         "en": "Tvam Dnyanamayo Vidnyanamayosi || 4 ||"
        }
       ]
      },
      {
       "para": true,
       "lines": [
        {
         "l": "p1l30",
         "mr": "सर्वं जगदिदं त्व॑त्तो जा॒यते ।",
         "en": "Sarvam Jagadidam Tvatto Jayate |"
        },
        {
         "l": "p1l31",
         "mr": "सर्वं जगदिदं त्व॑त्तस्ति॒ष्ठति ।",
         "en": "Sarvam Jagadidam Tvattastishthati |"
        },
        {
         "l": "p1l32",
         "mr": "सर्वं जगदिदं त्वयि लय॑मेष्य॒ति ।",
         "en": "Sarvam Jagadidam Tvayi Layameshyati |"
        },
        {
         "l": "p1l33",
         "mr": "सर्वं जगदिदं त्वयि॑ प्रत्ये॒ति ।",
         "en": "Sarvam Jagadidam Tvayi Pratyeti |"
        },
        {
         "l": "p1l34",
         "mr": "त्वं भूमिरापोऽनलोऽनि॑लो न॒भः ।",
         "en": "Tvam Bhumiraponalonilo Nabhah |"
        },
        {
         "l": "p1l35",
         "mr": "त्वं चत्वारि वा᳚क्पदा॒नि ॥ ५ ॥",
         "en": "Tvam Chatvari Vakpadani || 5 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l36",
         "mr": "त्वं गु॒णत्र॑याती॒तः ।",
         "en": "Tvam Gunatrayatitah |"
        },
        {
         "l": "p1l37",
         "mr": "त्वं अवस्थात्र॑याती॒तः ।",
         "en": "Tvam Avasthatrayatitah |"
        },
        {
         "l": "p1l38",
         "mr": "त्वं दे॒हत्र॑याती॒तः ।",
         "en": "Tvam Dehatrayatitah |"
        },
        {
         "l": "p1l39",
         "mr": "त्वं का॒लत्र॑याती॒तः ।",
         "en": "Tvam Kalatrayatitah |"
        },
        {
         "l": "p1l40",
         "mr": "त्वं मूलाधारस्थितो॑ऽसि नि॒त्यम् ।",
         "en": "Tvam Muladharasthitosi Nityam |"
        },
        {
         "l": "p1l41",
         "mr": "त्वं शक्तित्र॑यात्म॒कः ।",
         "en": "Tvam Shaktitrayatmakah |"
        },
        {
         "l": "p1l42",
         "mr": "त्वां योगिनो ध्याय॑न्ति नि॒त्यम् ।",
         "en": "Tvam Yogino Dhyayanti Nityam |"
        },
        {
         "l": "p1l43",
         "mr": "त्वं ब्रह्मा त्वं विष्णुस्त्वं<br>रुद्रस्त्वमिन्द्रस्त्वमग्निस्त्वं",
         "en": "Tvam Brahma Tvam Vishnustvam<br>Rudrastvamindrastvamagnistvam"
        },
        {
         "l": "p1l44",
         "mr": "वायुस्त्वं सूर्यस्त्वं चन्द्रमास्त्वं<br>ब्रह्म॒ भूर्भुवः॒ स्वरोम् ॥ ६ ॥",
         "en": "Vayustvam Suryastvam Chandramastvam<br>Brahma Bhurbhuvah Svarom || 6 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l45",
         "mr": "ग॒णादिं᳚ पूर्व॑मुच्चा॒र्य॒ व॒र्णादीं᳚ स्तदन॒न्तरम् ।",
         "en": "Ganadim Purvamuchcharya Varnadim Stadanantaram |"
        },
        {
         "l": "p1l46",
         "mr": "अनुस्वारः प॑रत॒रः । अर्धे᳚न्दुल॒सितम् ।",
         "en": "Anusvarah Paratarah | Ardhendulasitam |"
        },
        {
         "l": "p1l47",
         "mr": "तारे॑ण ऋ॒द्धम् । एतत्तव मनु॑स्वरू॒पम् ।",
         "en": "Tarena Ruddham | Etattava Manusvarupam |"
        },
        {
         "l": "p1l48",
         "mr": "गकारः पू᳚र्वरू॒पम् । अकारो मध्य॑मरू॒पम् ।",
         "en": "Gakarah Purvarupam | Akaro Madhyamarupam |"
        },
        {
         "l": "p1l49",
         "mr": "अनुस्वारश्चा᳚न्त्यरू॒पम् । बिन्दुरुत्त॑ररू॒पम् ।",
         "en": "Anusvarashchantyarupam | Binduruttararupam |"
        },
        {
         "l": "p1l50",
         "mr": "नादः॑ सन्धा॒नम् । सग्ंहि॑ता स॒न्धिः ।",
         "en": "Nadah Sandhanam | Samhita Sandhih |"
        },
        {
         "l": "p1l51",
         "mr": "सैषा गणे॑शवि॒द्या । गण॑क ऋ॒षिः ।",
         "en": "Saisha Ganeshavidya | Ganaka Rushih |"
        },
        {
         "l": "p1l52",
         "mr": "निचृद्गाय॑त्रीच्छ॒न्दः । गणपति॑र्देव॒ता ।",
         "en": "Nichrudgayatrichchhandah | Ganapatirdevata |"
        },
        {
         "l": "p1l53",
         "mr": "ॐ गं ग॒णप॑तये नमः ॥ ७ ॥",
         "en": "Om Gam Ganapataye Namah || 7 ||"
        }
       ]
      },
      {
       "para": true,
       "lines": [
        {
         "l": "p1l54",
         "mr": "एकद॒न्ताय॑ वि॒द्महे॑ वक्रतु॒ण्डाय॑ धीमहि ।",
         "en": "Ekadantaya Vidmahe Vakratundaya Dhimahi |"
        },
        {
         "l": "p1l55",
         "mr": "तन्नो॑ दन्तिः प्रचो॒दया᳚त् ॥ ८ ॥",
         "en": "Tanno Dantih Prachodayat || 8 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l56",
         "mr": "एकद॒न्तं च॑तुर्ह॒स्तं॒ पा॒शम॑ङ्कुश॒धारि॑णम् ।",
         "en": "Ekadantam Chaturhastam Pashamankushadharinam |"
        },
        {
         "l": "p1l57",
         "mr": "रदं॑ च॒ वर॑दं ह॒स्तै॒र्बि॒भ्राणं॑ मूष॒कध्व॑जम् ।",
         "en": "Radam Cha Varadam Hastairbibhranam Mushakadhvajam |"
        },
        {
         "l": "p1l58",
         "mr": "रक्तं॑ ल॒म्बोद॑रं शू॒र्प॒क॒र्णकं॑ रक्त॒वास॑सम् ।",
         "en": "Raktam Lambodaram Shurpakarnakam Raktavasasam |"
        },
        {
         "l": "p1l59",
         "mr": "रक्त॑ग॒न्धानु॑लिप्ता॒ङ्गं॒ र॒क्तपु॑ष्पैः सु॒पूजि॑तम् ।",
         "en": "Raktagandhanuliptangam Raktapushpaih Supujitam |"
        },
        {
         "l": "p1l60",
         "mr": "भक्ता॑नु॒कम्पि॑नं दे॒वं॒ ज॒गत्का॑रण॒मच्यु॑तम् ।",
         "en": "Bhaktanukampinam Devam Jagatkaranamachyutam |"
        },
        {
         "l": "p1l61",
         "mr": "आवि॑र्भू॒तं च॑ सृ॒ष्ट्या॒दौ॒<br>प्र॒कृतेः᳚ पुरु॒षात्प॑रम् ।",
         "en": "Avirbhutam Cha Srushtyadau<br>Prakruteh Purushatparam |"
        },
        {
         "l": "p1l62",
         "mr": "एवं॑ ध्या॒यति॑ यो नि॒त्यं॒<br>स॒ योगी॑ योगि॒नां व॑रः ॥ ९ ॥",
         "en": "Evam Dhyayati Yo Nityam<br>Sa Yogi Yoginam Varah || 9 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l63",
         "mr": "नमो व्रातपतये नमो गणपतये",
         "en": "Namo Vratapataye Namo Ganapataye"
        },
        {
         "l": "p1l64",
         "mr": "नमः प्रमथपतये",
         "en": "Namah Pramathapataye"
        },
        {
         "l": "p1l65",
         "mr": "नमस्तेऽस्तु लम्बोदरायैकदन्ताय",
         "en": "Namastestu Lambodarayaikadantaya"
        },
        {
         "l": "p1l66",
         "mr": "विघ्ननाशिने शिवसुताय",
         "en": "Vighnanashine Shivasutaya"
        },
        {
         "l": "p1l67",
         "mr": "वरदमूर्तये॒ नमः॑ ॥ १० ॥",
         "en": "Varadamurtaye Namah || 10 ||"
        }
       ]
      },
      {
       "para": true,
       "lines": [
        {
         "l": "p1l68",
         "mr": "एतदथर्वशीर्षं॑ योऽधी॒ते<br>स ब्रह्मभूया॑य क॒ल्पते ।",
         "en": "Etadatharvashirsham Yodhite<br>Sa Brahmabhuyaya Kalpate |"
        },
        {
         "l": "p1l69",
         "mr": "स सर्वविघ्नै᳚र्न बा॒ध्यते ।<br>स सर्वत्र सुख॑मेध॒ते ।",
         "en": "Sa Sarvavighnairna Badhyate |<br>Sa Sarvatra Sukhamedhate |"
        },
        {
         "l": "p1l70",
         "mr": "स पञ्चमहापापा᳚त् प्रमु॒च्यते ।",
         "en": "Sa Panchamahapapat Pramuchyate |"
        },
        {
         "l": "p1l71",
         "mr": "सा॒यम॑धीया॒नो॒ दिवसकृतं पापं॑ नाश॒यति ।",
         "en": "Sayamadhiyano Divasakrutam Papam Nashayati |"
        },
        {
         "l": "p1l72",
         "mr": "प्रा॒तर॑धीया॒नो॒ रात्रि॑कृतं पापं॑ नाश॒यति ।",
         "en": "Prataradhiyano Ratrikrutam Papam Nashayati |"
        },
        {
         "l": "p1l73",
         "mr": "सायं प्रातः प्र॑युञ्जा॒नो॒ पापोऽपा॑पो भ॒वति ।",
         "en": "Sayam Pratah Prayunjano Papopapo Bhavati |"
        },
        {
         "l": "p1l74",
         "mr": "सर्वत्राधीयानोऽपवि॑घ्नो भ॒वति ।",
         "en": "Sarvatradhiyanopavighno Bhavati |"
        },
        {
         "l": "p1l75",
         "mr": "धर्मार्थकाममोक्षं॑ च वि॒न्दति ।",
         "en": "Dharmarthakamamoksham Cha Vindati |"
        },
        {
         "l": "p1l76",
         "mr": "इदमथर्वशीर्षमशिष्याय॑ न दे॒यम् ।",
         "en": "Idamatharvashirshamashishyaya Na Deyam |"
        },
        {
         "l": "p1l77",
         "mr": "यो यदि मो॑हाद् दा॒स्यति<br>स पापी॑यान् भ॒वति ।",
         "en": "Yo Yadi Mohad Dasyati<br>Sa Papiyan Bhavati |"
        },
        {
         "l": "p1l78",
         "mr": "सहस्रावर्तनाद्यं यं काम॑मधी॒ते<br>तं तमने॑न सा॒धयेत् ॥ ११ ॥",
         "en": "Sahasravartanadyam Yam Kamamadhite<br>Tam Tamanena Sadhayet || 11 ||"
        }
       ]
      },
      {
       "para": true,
       "lines": [
        {
         "l": "p1l79",
         "mr": "अनेन गणपतिम॑भिषि॒ञ्चति<br>स वा॑ग्मी भ॒वति ।",
         "en": "Anena Ganapatimabhishinchati<br>Sa Vagmi Bhavati |"
        },
        {
         "l": "p1l80",
         "mr": "चतुर्थ्यामन॑श्नन् ज॒पति<br>स विद्या॑वान् भ॒वति ।",
         "en": "Chaturthyamanashnan Japati<br>Sa Vidyavan Bhavati |"
        },
        {
         "l": "p1l81",
         "mr": "इत्यथर्व॑णवा॒क्यम् ।",
         "en": "Ityatharvanavakyam |"
        },
        {
         "l": "p1l82",
         "mr": "ब्रह्माद्या॒वर॑णं वि॒द्यान्न बिभेति<br>कदा॑चने॒ति ॥ १२ ॥",
         "en": "Brahmadyavaranam Vidyanna Bibheti<br>Kadachaneti || 12 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l83",
         "mr": "यो दूर्वाङ्कु॑रैर्य॒जति<br>स वैश्रवणोप॑मो भ॒वति ।",
         "en": "Yo Durvankurairyajati<br>Sa Vaishravanopamo Bhavati |"
        },
        {
         "l": "p1l84",
         "mr": "यो ला॑जैर्य॒जति स यशो॑वान् भ॒वति ।",
         "en": "Yo Lajairyajati Sa Yashovan Bhavati |"
        },
        {
         "l": "p1l85",
         "mr": "स मेधा॑वान् भ॒वति ।",
         "en": "Sa Medhavan Bhavati |"
        },
        {
         "l": "p1l86",
         "mr": "यो मोदकसहस्रे॑ण य॒जति<br>स वाञ्छितफलम॑वाप्नो॒ति ।",
         "en": "Yo Modakasahasrena Yajati<br>Sa Vanchhitaphalamavapnoti |"
        },
        {
         "l": "p1l87",
         "mr": "यः साज्य समि॑द्भिर्य॒जति",
         "en": "Yah Sajya Samidbhiryajati"
        },
        {
         "l": "p1l88",
         "mr": "स सर्वं लभते स स॑र्वं ल॒भते ॥ १३ ॥",
         "en": "Sa Sarvam Labhate Sa Sarvam Labhate || 13 ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "p1l89",
         "mr": "अष्टौ ब्राह्मणान् सम्यग् ग्रा॑हयि॒त्वा<br>सूर्यवर्च॑स्वी भ॒वति ।",
         "en": "Ashtau Brahmanan Samyag Grahayitva<br>Suryavarchasvi Bhavati |"
        },
        {
         "l": "p1l90",
         "mr": "सूर्यग्रहे म॑हान॒द्यां प्रतिमासन्निधौ वा<br>ज॒प्त्वा सिद्धम॑न्त्रो भ॒वति ।",
         "en": "Suryagrahe Mahanadyam Pratimasannidhau Va<br>Japtva Siddhamantro Bhavati |"
        },
        {
         "l": "p1l91",
         "mr": "महाविघ्ना᳚त् प्रमु॒च्यते ।<br>महादोषा᳚त् प्रमु॒च्यते ।",
         "en": "Mahavighnat Pramuchyate |<br>Mahadoshat Pramuchyate |"
        },
        {
         "l": "p1l92",
         "mr": "महाप्रत्यवाया᳚त् प्रमु॒च्यते ।",
         "en": "Mahapratyavayat Pramuchyate |"
        },
        {
         "l": "p1l93",
         "mr": "स सर्वविद्भवति स सर्व॑विद्भ॒वति ।",
         "en": "Sa Sarvavidbhavati Sa Sarvavidbhavati |"
        },
        {
         "l": "p1l94",
         "mr": "य ए॑वं वे॒द । इत्यु॑प॒निष॑त् ॥ १४ ॥",
         "en": "Ya Evam Veda | Ityupanishat || 14 ||"
        }
       ]
      },
      {
       "kind": "dh",
       "lines": [
        {
         "l": "p1l95",
         "mr": "॥ ॐ शान्तिः॒ शान्तिः॒ शान्तिः॑ ॥",
         "en": "|| Om Shantih Shantih Shantih ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\"><a href=\"https://mr.wikipedia.org/wiki/गणपती_अथर्वशीर्ष\" target=\"_blank\" rel=\"noopener\" aria-label=\"अथर्ववेदीय उपनिषद — विकिपीडिया (नवीन टॅबमध्ये उघडेल)\">अथर्ववेदीय उपनिषद<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a></span><span class=\"en\" lang=\"en\"><a href=\"https://en.wikipedia.org/wiki/Ganapati_Atharvaśīrṣa\" target=\"_blank\" rel=\"noopener\" aria-label=\"An Atharva Veda Upanishad: Wikipedia (opens in a new tab)\">An Atharva Veda Upanishad<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a></span>"
    }
   ]
  },
  {
   "id": "g-aarti",
   "btn": "xfb",
   "name": {
    "mr": "आरती",
    "en": "Aarti"
   },
   "pieces": [
    {
     "id": "a1",
     "no": {
      "mr": "१.",
      "en": "1."
     },
     "title": {
      "mr": "गणपतीची आरती",
      "en": "Ganapati Aarti"
     },
     "tag": {
      "mr": "मराठी",
      "en": "Marathi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "जय देव जय देव, जय मंगल मूर्ती ।",
        "en": "Jai Dev Jai Dev, Jai Mangal Murti |"
       },
       {
        "mr": "दर्शनमात्रे मनःकामना पूर्ती ।",
        "en": "Darshan Maatre Manakaamna Purti |"
       },
       {
        "mr": "जय देव जय देव ॥ धृ. ॥",
        "en": "Jai Dev Jai Dev || Dhr. ||"
       }
      ]
     },
     "items": [
      {
       "lines": [
        {
         "l": "s1l1",
         "mr": "सुखकर्ता दुःखहर्ता, वार्ता विघ्नाची ।",
         "en": "Sukhkarta Dukhharta, Varta Vighnachi |"
        },
        {
         "l": "s1l2",
         "mr": "नुरवी पुरवी प्रेम कृपा जयाची ।",
         "en": "Nurvi Purvi Prem Krupa Jayachi |"
        },
        {
         "l": "s1l3",
         "mr": "सर्वांगी सुंदर उटी शेंदुराची ।",
         "en": "Sarvangi Sundar Uti Shendurachi |"
        },
        {
         "l": "s1l4",
         "mr": "कंठी झळके माळ मुक्ताफळांची ॥",
         "en": "Kanthi Jhalke Mal Muktaphalanchi ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s1l5",
         "rf": true,
         "mr": "जय देव जय देव, जय मंगल मूर्ती ।",
         "en": "Jai Dev Jai Dev, Jai Mangal Murti |"
        },
        {
         "l": "s1l6",
         "rf": true,
         "mr": "दर्शनमात्रे मनःकामना पूर्ती ।",
         "en": "Darshan Maatre Manakaamna Purti |"
        },
        {
         "l": "s1l7",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s1l8",
         "mr": "रत्नखचित फरा तुज गौरीकुमरा ।",
         "en": "Ratnakhachit Phara Tuj Gaurikumra |"
        },
        {
         "l": "s1l9",
         "mr": "चंदनाची उटी कुंकुमकेशरा ।",
         "en": "Chandanaachi Uti Kumkumkeshara |"
        },
        {
         "l": "s1l10",
         "mr": "हिरेजडित मुकुट शोभतो बरा ।",
         "en": "Hirejadit Mukut Shobhato Bara |"
        },
        {
         "l": "s1l11",
         "mr": "रुणझुणती नूपुरे चरणी घागरिया ॥",
         "en": "Runjhunati Nupure Charani Ghagariya ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s1l12",
         "rf": true,
         "mr": "जय देव जय देव, जय मंगल मूर्ती ।",
         "en": "Jai Dev Jai Dev, Jai Mangal Murti |"
        },
        {
         "l": "s1l13",
         "rf": true,
         "mr": "दर्शनमात्रे मनःकामना पूर्ती ।",
         "en": "Darshan Maatre Manakaamna Purti |"
        },
        {
         "l": "s1l14",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s1l15",
         "mr": "लंबोदर पीतांबर फणिवरबंधना ।",
         "en": "Lambodar Pitaambar Phanivarbandhana |"
        },
        {
         "l": "s1l16",
         "mr": "सरळ सोंड वक्रतुंड त्रिनयना ।",
         "en": "Saral Sond Vakratunda Trinayana |"
        },
        {
         "l": "s1l17",
         "mr": "दास रामाचा वाट पाहे सदना ।",
         "en": "Das Ramacha Vaat Pahe Sadana |"
        },
        {
         "l": "s1l18",
         "mr": "संकटी पावावे निर्वाणी रक्षावे सुरवरवंदना ॥",
         "en": "Sankati Pavave Nirvani Rakshave Survarvandana ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s1l19",
         "rf": true,
         "mr": "जय देव जय देव, जय मंगल मूर्ती ।",
         "en": "Jai Dev Jai Dev, Jai Mangal Murti |"
        },
        {
         "l": "s1l20",
         "rf": true,
         "mr": "दर्शनमात्रे मनःकामना पूर्ती ।",
         "en": "Darshan Maatre Manakaamna Purti |"
        },
        {
         "l": "s1l21",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : <a href=\"https://mr.wikipedia.org/wiki/सुखकर्ता_दुःखहर्ता\" target=\"_blank\" rel=\"noopener\" aria-label=\"समर्थ रामदास — विकिपीडिया (नवीन टॅबमध्ये उघडेल)\">समर्थ रामदास<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (१६०८–१६८२)</span><span class=\"en\" lang=\"en\">By <a href=\"https://en.wikipedia.org/wiki/Sukhakarta_Dukhaharta\" target=\"_blank\" rel=\"noopener\" aria-label=\"Samarth Ramdas: Wikipedia (opens in a new tab)\">Samarth Ramdas<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (1608–1682)</span>"
    },
    {
     "id": "a2",
     "lang": "hi",
     "no": {
      "mr": "२.",
      "en": "2."
     },
     "title": {
      "mr": "गणपति जी की आरती",
      "en": "Ganapati Ji ki Aarti"
     },
     "tag": {
      "mr": "हिंदी",
      "en": "Hindi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "जय जय श्री गणराज विद्या सुखदाता ।",
        "en": "Jai Jai Shri Ganraj Vidyasukhdata |"
       },
       {
        "mr": "धन्य तुम्हारा दर्शन मेरा मन रमता ।",
        "en": "Dhanya Tumhara Darshan Mera Man Ramata |"
       },
       {
        "mr": "जय देव जय देव ॥ धृ. ॥",
        "en": "Jai Dev Jai Dev || Dhr. ||"
       }
      ]
     },
     "items": [
      {
       "lines": [
        {
         "l": "s2l1",
         "mr": "शेंदुर लाल चढ़ायो अच्छा गजमुख को ।",
         "en": "Shendur Laal Chadhayo Achchha Gajmukh Ko |"
        },
        {
         "l": "s2l2",
         "mr": "दुंदिल लाल बिराजे सुत गौरिहर को ।",
         "en": "Dundil Laal Biraje Sut Gaurihar Ko |"
        },
        {
         "l": "s2l3",
         "mr": "हाथ लिए गुड़-लड्डू साईं सुरवर को ।",
         "en": "Haath Liye Gud-Laddu Sai Survar Ko |"
        },
        {
         "l": "s2l4",
         "mr": "महिमा कहे न जाय लागत हूँ पाद को ॥",
         "en": "Mahima Kahe Na Jay Lagat Hoon Paad Ko ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s2l5",
         "rf": true,
         "mr": "जय जय श्री गणराज विद्या सुखदाता ।",
         "en": "Jai Jai Shri Ganraj Vidyasukhdata |"
        },
        {
         "l": "s2l6",
         "rf": true,
         "mr": "धन्य तुम्हारा दर्शन मेरा मन रमता ।",
         "en": "Dhanya Tumhara Darshan Mera Man Ramata |"
        },
        {
         "l": "s2l7",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s2l8",
         "mr": "अष्टौ सिद्धि दासी संकट को बैरि ।",
         "en": "Ashtau Siddhi Dasi Sankat Ko Bairi |"
        },
        {
         "l": "s2l9",
         "mr": "विघ्नविनाशन मंगल मूरत अधिकारी ।",
         "en": "Vighnavinashan Mangal Murat Adhikari |"
        },
        {
         "l": "s2l10",
         "mr": "कोटी सूरज प्रकाश ऐसी छबि तेरी ।",
         "en": "Koti Suraj Prakash Aisi Chhabi Teri |"
        },
        {
         "l": "s2l11",
         "mr": "गंडस्थल मदमस्तक झूले शशिबिहारी ॥",
         "en": "Gandasthala Madmastak Jhoole Shashibihari ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s2l12",
         "rf": true,
         "mr": "जय जय श्री गणराज विद्या सुखदाता ।",
         "en": "Jai Jai Shri Ganraj Vidyasukhdata |"
        },
        {
         "l": "s2l13",
         "rf": true,
         "mr": "धन्य तुम्हारा दर्शन मेरा मन रमता ।",
         "en": "Dhanya Tumhara Darshan Mera Man Ramata |"
        },
        {
         "l": "s2l14",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s2l15",
         "mr": "भावभगत से कोई शरणागत आवे ।",
         "en": "Bhavbhagat Se Koi Sharanagat Aave |"
        },
        {
         "l": "s2l16",
         "mr": "संतत संपत सबही भरपूर पावे ।",
         "en": "Santat Sampat Sabhi Bharpur Pave |"
        },
        {
         "l": "s2l17",
         "mr": "ऐसे तुम महाराज मोको अति भावे ।",
         "en": "Aise Tum Maharaj Moko Ati Bhave |"
        },
        {
         "l": "s2l18",
         "mr": "गोसावीनंदन निशिदिन गुण गावे ॥",
         "en": "Gosavinandan Nishidin Gun Gave ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s2l19",
         "rf": true,
         "mr": "जय जय श्री गणराज विद्या सुखदाता ।",
         "en": "Jai Jai Shri Ganraj Vidyasukhdata |"
        },
        {
         "l": "s2l20",
         "rf": true,
         "mr": "धन्य तुम्हारा दर्शन मेरा मन रमता ।",
         "en": "Dhanya Tumhara Darshan Mera Man Ramata |"
        },
        {
         "l": "s2l21",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : गोसावीनंदन</span><span class=\"en\" lang=\"en\">By Gosavinandan</span>"
    },
    {
     "id": "a3",
     "no": {
      "mr": "३.",
      "en": "3."
     },
     "title": {
      "mr": "देवीची आरती",
      "en": "Devi Aarti"
     },
     "tag": {
      "mr": "मराठी",
      "en": "Marathi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "जय देवी जय देवी महिषासुरमर्दिनी ।",
        "en": "Jai Devi Jai Devi Mahishasuramardini |"
       },
       {
        "mr": "सुरवर ईश्वर वरदे तारक संजीवनी ।",
        "en": "Survar Ishwara Varade Taraka Sanjivani |"
       },
       {
        "mr": "जय देवी जय देवी ॥ धृ. ॥",
        "en": "Jai Devi Jai Devi || Dhr. ||"
       }
      ]
     },
     "items": [
      {
       "lines": [
        {
         "l": "s3l1",
         "mr": "दुर्गे दुर्घट भारी तुजविण संसारी ।",
         "en": "Durge Durghat Bhari Tujvin Sansari |"
        },
        {
         "l": "s3l2",
         "mr": "अनाथनाथे अंबे करुणा विस्तारी ।",
         "en": "Anathanathe Ambe Karuna Vistari |"
        },
        {
         "l": "s3l3",
         "mr": "वारी वारी जन्ममरणाते वारी ।",
         "en": "Vari Vari Janmamaranate Vari |"
        },
        {
         "l": "s3l4",
         "mr": "हारी पडलो आता संकट निवारी ॥",
         "en": "Hari Padalo Ata Sankat Nivari ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s3l5",
         "rf": true,
         "mr": "जय देवी जय देवी महिषासुरमर्दिनी ।",
         "en": "Jai Devi Jai Devi Mahishasuramardini |"
        },
        {
         "l": "s3l6",
         "rf": true,
         "mr": "सुरवर ईश्वर वरदे तारक संजीवनी ।",
         "en": "Survar Ishwara Varade Taraka Sanjivani |"
        },
        {
         "l": "s3l7",
         "rf": true,
         "mr": "जय देवी जय देवी ॥ धृ. ॥",
         "en": "Jai Devi Jai Devi || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s3l8",
         "mr": "त्रिभुवन भुवनी पाहत तुज ऐसे नाही ।",
         "en": "Tribhuvana Bhuvani Pahata Tuja Aise Nahi |"
        },
        {
         "l": "s3l9",
         "mr": "चारी श्रमले परंतु न बोलवे काही ।",
         "en": "Chari Shramale Parantu Na Bolve Kahi |"
        },
        {
         "l": "s3l10",
         "mr": "साही विवाद करिता पडिलो प्रवाही ।",
         "en": "Sahi Vivad Karita Padilo Pravahi |"
        },
        {
         "l": "s3l11",
         "mr": "ते तूं भक्तांलागी पावसि लवलाही ॥",
         "en": "Te Tu Bhaktalagi Pavasi Lavalahi ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s3l12",
         "rf": true,
         "mr": "जय देवी जय देवी महिषासुरमर्दिनी ।",
         "en": "Jai Devi Jai Devi Mahishasuramardini |"
        },
        {
         "l": "s3l13",
         "rf": true,
         "mr": "सुरवर ईश्वर वरदे तारक संजीवनी ।",
         "en": "Survar Ishwara Varade Taraka Sanjivani |"
        },
        {
         "l": "s3l14",
         "rf": true,
         "mr": "जय देवी जय देवी ॥ धृ. ॥",
         "en": "Jai Devi Jai Devi || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s3l15",
         "mr": "प्रसन्न वदने प्रसन्न होसी निजदासा ।",
         "en": "Prasanna Vadane Prasanna Hosi Nijadasa |"
        },
        {
         "l": "s3l16",
         "mr": "क्लेशांपासुनि सोडवी तोडी भवपाशा ।",
         "en": "Kleshampasuni Sodavi Todi Bhavapasha |"
        },
        {
         "l": "s3l17",
         "mr": "अंबे तुजवाचून कोण पुरवी आशा ।",
         "en": "Ambe Tujvachun Kon Purvi Asha |"
        },
        {
         "l": "s3l18",
         "mr": "नरहर तल्लीन झाला पद पंकज लेशा ॥",
         "en": "Narahar Tallina Jhala Pada Pankaja Lesha ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s3l19",
         "rf": true,
         "mr": "जय देवी जय देवी महिषासुरमर्दिनी ।",
         "en": "Jai Devi Jai Devi Mahishasuramardini |"
        },
        {
         "l": "s3l20",
         "rf": true,
         "mr": "सुरवर ईश्वर वरदे तारक संजीवनी ।",
         "en": "Survar Ishwara Varade Taraka Sanjivani |"
        },
        {
         "l": "s3l21",
         "rf": true,
         "mr": "जय देवी जय देवी ॥ धृ. ॥",
         "en": "Jai Devi Jai Devi || Dhr. ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : <a href=\"https://mr.wikipedia.org/wiki/नरहरी_सोनार\" target=\"_blank\" rel=\"noopener\" aria-label=\"संत नरहरी सोनार — विकिपीडिया (नवीन टॅबमध्ये उघडेल)\">संत नरहरी सोनार<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (१३ वे शतक)</span><span class=\"en\" lang=\"en\">By <a href=\"https://en.wikipedia.org/wiki/Narahari_Sonar\" target=\"_blank\" rel=\"noopener\" aria-label=\"Sant Narahari Sonar: Wikipedia (opens in a new tab)\">Sant Narahari Sonar<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (13th century)</span>"
    },
    {
     "id": "a4",
     "no": {
      "mr": "४.",
      "en": "4."
     },
     "title": {
      "mr": "शंकराची आरती",
      "en": "Shankar Aarti"
     },
     "tag": {
      "mr": "मराठी",
      "en": "Marathi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "जय देव जय देव जय श्रीशंकरा ।",
        "en": "Jai Dev Jai Dev Jai Shri Shankara |"
       },
       {
        "mr": "आरती ओवाळू तुज कर्पूरगौरा ।",
        "en": "Aarti Ovalu Tuja Karpuragaura |"
       },
       {
        "mr": "जय देव जय देव ॥ धृ. ॥",
        "en": "Jai Dev Jai Dev || Dhr. ||"
       }
      ]
     },
     "items": [
      {
       "lines": [
        {
         "l": "s4l1",
         "mr": "लवथवती विक्राळा ब्रह्मांडी माळा ।",
         "en": "Lavathavati Vikrala Brahmandi Mala |"
        },
        {
         "l": "s4l2",
         "mr": "विषे कंठ काळा त्रिनेत्री ज्वाळा ।",
         "en": "Vishe Kantha Kala Trinetri Jwala |"
        },
        {
         "l": "s4l3",
         "mr": "लावण्य सुंदर मस्तकी बाळा ।",
         "en": "Lavanya Sundar Mastaki Bala |"
        },
        {
         "l": "s4l4",
         "mr": "तेथुनिया जल निर्मळ वाहे झुळझुळा ॥",
         "en": "Tethuniya Jal Nirmal Vahe Jhulajhula ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s4l5",
         "rf": true,
         "mr": "जय देव जय देव जय श्रीशंकरा ।",
         "en": "Jai Dev Jai Dev Jai Shri Shankara |"
        },
        {
         "l": "s4l6",
         "rf": true,
         "mr": "आरती ओवाळू तुज कर्पूरगौरा ।",
         "en": "Aarti Ovalu Tuja Karpuragaura |"
        },
        {
         "l": "s4l7",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s4l8",
         "mr": "कर्पूरगौरा भोळा नयनी विशाळा ।",
         "en": "Karpuragaura Bhola Nayani Vishala |"
        },
        {
         "l": "s4l9",
         "mr": "अर्धांगी पार्वती सुमनांच्या माळा ।",
         "en": "Ardhangi Parvati Sumananchya Mala |"
        },
        {
         "l": "s4l10",
         "mr": "विभूतीचे उधळण शितिकंठ नीळा ।",
         "en": "Vibhutiche Udhalana Shitikanth Nila |"
        },
        {
         "l": "s4l11",
         "mr": "ऐसा शंकर शोभे उमा वेल्हाळा ॥",
         "en": "Aisa Shankar Shobhe Uma Velhala ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s4l12",
         "rf": true,
         "mr": "जय देव जय देव जय श्रीशंकरा ।",
         "en": "Jai Dev Jai Dev Jai Shri Shankara |"
        },
        {
         "l": "s4l13",
         "rf": true,
         "mr": "आरती ओवाळू तुज कर्पूरगौरा ।",
         "en": "Aarti Ovalu Tuja Karpuragaura |"
        },
        {
         "l": "s4l14",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s4l15",
         "mr": "देवी दैत्यी सागरमंथन पै केले ।",
         "en": "Devi Daityi Sagarmanthan Pai Kele |"
        },
        {
         "l": "s4l16",
         "mr": "त्यामाजी अवचित हळाहळ जे उठले ।",
         "en": "Tyamaji Avachit Halahal Je Uthale |"
        },
        {
         "l": "s4l17",
         "mr": "ते त्वा असुरपणे प्राशन केले ।",
         "en": "Te Tva Asurapane Prashan Kele |"
        },
        {
         "l": "s4l18",
         "mr": "नीलकंठ नाम प्रसिद्ध झाले ॥",
         "en": "Nilakanth Nam Prasiddha Jhale ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s4l19",
         "rf": true,
         "mr": "जय देव जय देव जय श्रीशंकरा ।",
         "en": "Jai Dev Jai Dev Jai Shri Shankara |"
        },
        {
         "l": "s4l20",
         "rf": true,
         "mr": "आरती ओवाळू तुज कर्पूरगौरा ।",
         "en": "Aarti Ovalu Tuja Karpuragaura |"
        },
        {
         "l": "s4l21",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s4l22",
         "mr": "व्याघ्रांबर फणिवरधर सुंदर मदनारी ।",
         "en": "Vyaghrambar Phanivardhar Sundar Madanari |"
        },
        {
         "l": "s4l23",
         "mr": "पंचानन मनमोहन मुनिजन सुखकारी ।",
         "en": "Panchanan Manmohan Munijan Sukhakari |"
        },
        {
         "l": "s4l24",
         "mr": "शतकोटीचे बीज वाचे उच्चारी ।",
         "en": "Shatakotiche Beej Vache Uchchari |"
        },
        {
         "l": "s4l25",
         "mr": "रघुकुळटिळक रामदासा अंतरी ॥",
         "en": "Raghukulatilak Ramdasa Antari ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s4l26",
         "rf": true,
         "mr": "जय देव जय देव जय श्रीशंकरा ।",
         "en": "Jai Dev Jai Dev Jai Shri Shankara |"
        },
        {
         "l": "s4l27",
         "rf": true,
         "mr": "आरती ओवाळू तुज कर्पूरगौरा ।",
         "en": "Aarti Ovalu Tuja Karpuragaura |"
        },
        {
         "l": "s4l28",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : <a href=\"https://mr.wikipedia.org/wiki/समर्थ_रामदास_स्वामी\" target=\"_blank\" rel=\"noopener\" aria-label=\"समर्थ रामदास — विकिपीडिया (नवीन टॅबमध्ये उघडेल)\">समर्थ रामदास<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (१६०८–१६८२)</span><span class=\"en\" lang=\"en\">By <a href=\"https://en.wikipedia.org/wiki/Samarth_Ramdas\" target=\"_blank\" rel=\"noopener\" aria-label=\"Samarth Ramdas: Wikipedia (opens in a new tab)\">Samarth Ramdas<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (1608–1682)</span>"
    },
    {
     "id": "a5",
     "no": {
      "mr": "५.",
      "en": "5."
     },
     "title": {
      "mr": "दत्ताची आरती",
      "en": "Dattatreya Aarti"
     },
     "tag": {
      "mr": "मराठी",
      "en": "Marathi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "जय देव जय देव जय श्री गुरुदत्ता ।",
        "en": "Jai Dev Jai Dev Jai Shri Gurudatta |"
       },
       {
        "mr": "आरती ओवाळिता हरली भवचिंता ।",
        "en": "Aarti Ovalita Harali Bhavachinta |"
       },
       {
        "mr": "जय देव जय देव ॥ धृ. ॥",
        "en": "Jai Dev Jai Dev || Dhr. ||"
       }
      ]
     },
     "items": [
      {
       "lines": [
        {
         "l": "s5l1",
         "mr": "त्रिगुणात्मक त्रैमूर्ती दत्त हा जाणा ।",
         "en": "Trigunatmak Traimurti Datta Ha Jaana |"
        },
        {
         "l": "s5l2",
         "mr": "त्रिगुणी अवतार त्रैलोक्यराणा ।",
         "en": "Triguni Avatar Trailokyarana |"
        },
        {
         "l": "s5l3",
         "mr": "नेति नेति शब्द न ये अनुमाना ।",
         "en": "Neti Neti Shabda Na Ye Anumana |"
        },
        {
         "l": "s5l4",
         "mr": "सुरवर मुनिजन योगी समाधी न ये ध्याना ॥",
         "en": "Survar Munijan Yogi Samadhi Na Ye Dhyana ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s5l5",
         "rf": true,
         "mr": "जय देव जय देव जय श्री गुरुदत्ता ।",
         "en": "Jai Dev Jai Dev Jai Shri Gurudatta |"
        },
        {
         "l": "s5l6",
         "rf": true,
         "mr": "आरती ओवाळिता हरली भवचिंता ।",
         "en": "Aarti Ovalita Harali Bhavachinta |"
        },
        {
         "l": "s5l7",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s5l8",
         "mr": "सबाह्य अभ्यंतरी तू एक दत्त ।",
         "en": "Sabahya Abhyantari Tu Ek Datta |"
        },
        {
         "l": "s5l9",
         "mr": "अभाग्यासी कैसी न कळे ही मात ।",
         "en": "Abhagyasi Kaisi Na Kale Hi Maat |"
        },
        {
         "l": "s5l10",
         "mr": "पराही परतली तेथे कैंचा हेत ।",
         "en": "Parahi Paratali Tethe Kaincha Het |"
        },
        {
         "l": "s5l11",
         "mr": "जन्ममरणाचा पुरलासे अंत ॥",
         "en": "Janmamaranacha Purlase Anta ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s5l12",
         "rf": true,
         "mr": "जय देव जय देव जय श्री गुरुदत्ता ।",
         "en": "Jai Dev Jai Dev Jai Shri Gurudatta |"
        },
        {
         "l": "s5l13",
         "rf": true,
         "mr": "आरती ओवाळिता हरली भवचिंता ।",
         "en": "Aarti Ovalita Harali Bhavachinta |"
        },
        {
         "l": "s5l14",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s5l15",
         "mr": "दत्त येऊनिया उभा ठाकला ।",
         "en": "Datta Yeuniya Ubha Thakala |"
        },
        {
         "l": "s5l16",
         "mr": "सद्भावे साष्टांगे प्रणिपात केला ।",
         "en": "Sadbhave Sashtange Pranipat Kela |"
        },
        {
         "l": "s5l17",
         "mr": "प्रसन्न होऊनी आशीर्वाद दिधला ।",
         "en": "Prasanna Houni Ashirwad Didhala |"
        },
        {
         "l": "s5l18",
         "mr": "जन्ममरणाचा फेरा चुकविला ॥",
         "en": "Janmamaranacha Phera Chukavila ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s5l19",
         "rf": true,
         "mr": "जय देव जय देव जय श्री गुरुदत्ता ।",
         "en": "Jai Dev Jai Dev Jai Shri Gurudatta |"
        },
        {
         "l": "s5l20",
         "rf": true,
         "mr": "आरती ओवाळिता हरली भवचिंता ।",
         "en": "Aarti Ovalita Harali Bhavachinta |"
        },
        {
         "l": "s5l21",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s5l22",
         "mr": "दत्त दत्त ऐसे लागले ध्यान ।",
         "en": "Datta Datta Aise Lagale Dhyan |"
        },
        {
         "l": "s5l23",
         "mr": "हारपले मन झाले उन्मन ।",
         "en": "Harpale Man Jhale Unman |"
        },
        {
         "l": "s5l24",
         "mr": "मी-तू पणाची झाली बोळवण ।",
         "en": "Mi-Tu Panachi Jhali Bolvan |"
        },
        {
         "l": "s5l25",
         "mr": "एका जनार्दनी श्री दत्तध्यान ॥",
         "en": "Eka Janardani Shri Dattadhyan ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s5l26",
         "rf": true,
         "mr": "जय देव जय देव जय श्री गुरुदत्ता ।",
         "en": "Jai Dev Jai Dev Jai Shri Gurudatta |"
        },
        {
         "l": "s5l27",
         "rf": true,
         "mr": "आरती ओवाळिता हरली भवचिंता ।",
         "en": "Aarti Ovalita Harali Bhavachinta |"
        },
        {
         "l": "s5l28",
         "rf": true,
         "mr": "जय देव जय देव ॥ धृ. ॥",
         "en": "Jai Dev Jai Dev || Dhr. ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : <a href=\"https://mr.wikipedia.org/wiki/एकनाथ\" target=\"_blank\" rel=\"noopener\" aria-label=\"संत एकनाथ — विकिपीडिया (नवीन टॅबमध्ये उघडेल)\">संत एकनाथ<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (१५३३–१५९९)</span><span class=\"en\" lang=\"en\">By <a href=\"https://en.wikipedia.org/wiki/Eknath\" target=\"_blank\" rel=\"noopener\" aria-label=\"Sant Eknath: Wikipedia (opens in a new tab)\">Sant Eknath<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (1533–1599)</span>"
    },
    {
     "id": "a6",
     "no": {
      "mr": "६.",
      "en": "6."
     },
     "title": {
      "mr": "ज्ञानेश्वरांची आरती",
      "en": "Dnyaneshwar Aarti"
     },
     "tag": {
      "mr": "मराठी",
      "en": "Marathi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "आरती ज्ञानराजा ॥ धृ. ॥",
        "en": "Aarti Dnyanaraja || Dhr. ||"
       }
      ]
     },
     "items": [
      {
       "lines": [
        {
         "l": "s6l1",
         "mr": "आरती ज्ञानराजा ।​<br>हो महाकैवल्यतेजा, कैवल्यतेजा ।",
         "en": "Aarti Dnyanaraja | Ho Mahakaivalyateja, Kaivalyateja |"
        },
        {
         "l": "s6l2",
         "mr": "सेविती साधुसंत ।​<br>हो मनु वेधला माझा, वेधला माझा ॥",
         "en": "Seviti Sadhusant | Ho Manu Vedhala Majha, Vedhala Majha ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s6l3",
         "rf": true,
         "mr": "आरती ज्ञानराजा ॥ धृ. ॥",
         "en": "Aarti Dnyanaraja || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s6l4",
         "mr": "लोपलें ज्ञान जगीं ।​<br>हित नेणती कोणी, नेणती कोणी ।",
         "en": "Lopale Dnyan Jagi | Hita Nenati Koni, Nenati Koni |"
        },
        {
         "l": "s6l5",
         "mr": "अवतार पांडुरंग ।​<br>नाम ठेविलें ज्ञानी, ठेविलें ज्ञानी ॥",
         "en": "Avatar Pandurang | Nam Thevile Dnyani, Thevile Dnyani ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s6l6",
         "rf": true,
         "mr": "आरती ज्ञानराजा ॥ धृ. ॥",
         "en": "Aarti Dnyanaraja || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s6l7",
         "mr": "कनकाचें ताट करीं ।​<br>उभ्या गोपिका नारी, गोपिका नारी ।",
         "en": "Kanakache Taat Kari | Ubhya Gopika Nari, Gopika Nari |"
        },
        {
         "l": "s6l8",
         "mr": "नारद तुंबरु हो ।​<br>साम गायन करी, गायन करी ॥",
         "en": "Narad Tumbaru Ho | Saama Gaayan Kari, Gaayan Kari ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s6l9",
         "rf": true,
         "mr": "आरती ज्ञानराजा ॥ धृ. ॥",
         "en": "Aarti Dnyanaraja || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s6l10",
         "mr": "प्रगट गुह्य बोले ।​<br>विश्व ब्रह्मची केलें, ब्रह्मची केलें ।",
         "en": "Pragat Guhya Bole | Vishwa Brahmachi Kele, Brahmachi Kele |"
        },
        {
         "l": "s6l11",
         "mr": "रामा जनार्दनी ।​<br>पायीं मस्तक ठेविलें, मस्तक ठेविलें ॥",
         "en": "Rama Janardani | Paayi Mastak Thevile, Mastak Thevile ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s6l12",
         "rf": true,
         "mr": "आरती ज्ञानराजा ॥ धृ. ॥",
         "en": "Aarti Dnyanaraja || Dhr. ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : रामा जनार्दन</span><span class=\"en\" lang=\"en\">By Rama Janardan</span>"
    },
    {
     "id": "a7",
     "no": {
      "mr": "७.",
      "en": "7."
     },
     "title": {
      "mr": "विठ्ठलाची आरती",
      "en": "Vitthal Aarti"
     },
     "tag": {
      "mr": "मराठी",
      "en": "Marathi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "येई ओ विठ्ठले माझी माऊली ये ।​<br>येई ओ विठ्ठले माझी माऊली ये ॥ धृ. ॥",
        "en": "Yei O Vitthale Majhi Maauli Ye |<br>Yei O Vitthale Majhi Maauli Ye || Dhr. ||"
       }
      ]
     },
     "items": [
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s7l1",
         "rf": true,
         "mr": "येई ओ विठ्ठले माझी माऊली ये ।​<br>येई ओ विठ्ठले माझी माऊली ये ॥ धृ. ॥",
         "en": "Yei O Vitthale Majhi Maauli Ye |<br>Yei O Vitthale Majhi Maauli Ye || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s7l2",
         "mr": "निढळावरी कर, ​निढळावरी कर ठेवुनी वाट मी पाहे ।",
         "en": "Nidhalavari Kar, Nidhalavari Kar Thevuni Vaat Mi Pahe |"
        },
        {
         "l": "s7l3",
         "mr": "हो देवा वाट मी पाहे ॥",
         "en": "Ho Deva Vaat Mi Pahe ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s7l4r",
         "rf": true,
         "mr": "येई ओ विठ्ठले माझी माऊली ये ।​<br>येई ओ विठ्ठले माझी माऊली ये ॥ धृ. ॥",
         "en": "Yei O Vitthale Majhi Maauli Ye |<br>Yei O Vitthale Majhi Maauli Ye || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s7l5",
         "mr": "आलिया गेलीया हातीं धाडी निरोप ।",
         "en": "Aaliya Geliya Haati Dhadi Nirop |"
        },
        {
         "l": "s7l6",
         "mr": "आलिया गेलीया हातीं धाडी निरोप ।",
         "en": "Aaliya Geliya Haati Dhadi Nirop |"
        },
        {
         "l": "s7l7",
         "mr": "पंढरपुरी आहे, ​पंढरपुरी आहे माझा मायबाप ।",
         "en": "Pandharpuri Aahe, Pandharpuri Aahe Majha Maaybaap |"
        },
        {
         "l": "s7l8",
         "mr": "हो माझा मायबाप ॥",
         "en": "Ho Majha Maaybaap ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s7l9",
         "rf": true,
         "mr": "येई ओ विठ्ठले माझी माऊली ये ।​<br>येई ओ विठ्ठले माझी माऊली ये ॥ धृ. ॥",
         "en": "Yei O Vitthale Majhi Maauli Ye |<br>Yei O Vitthale Majhi Maauli Ye || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s7l10",
         "mr": "पिवळा पीतांबर कैसा गगनी झळकला ।",
         "en": "Pivala Pitaambar Kaisa Gagani Jhalakala |"
        },
        {
         "l": "s7l11",
         "mr": "पिवळा पीतांबर कैसा गगनी झळकला ।",
         "en": "Pivala Pitaambar Kaisa Gagani Jhalakala |"
        },
        {
         "l": "s7l12",
         "mr": "गरुडावरी बैसोनी, ​गरुडावरी बैसोनी माझा कैवारी आला ।",
         "en": "Garudavari Baisoni, Garudavari Baisoni Majha Kaivari Aala |"
        },
        {
         "l": "s7l13",
         "mr": "हो माझा कैवारी आला ॥",
         "en": "Ho Majha Kaivari Aala ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s7l14",
         "rf": true,
         "mr": "येई ओ विठ्ठले माझी माऊली ये ।​<br>येई ओ विठ्ठले माझी माऊली ये ॥ धृ. ॥",
         "en": "Yei O Vitthale Majhi Maauli Ye |<br>Yei O Vitthale Majhi Maauli Ye || Dhr. ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s7l15",
         "mr": "विठोबाचे राज आम्हां नित्य दिपवाळी ।",
         "en": "Vithobache Raaj Aamha Nitya Dipavali |"
        },
        {
         "l": "s7l16",
         "mr": "विठोबाचे राज आम्हां नित्य दिपवाळी ।",
         "en": "Vithobache Raaj Aamha Nitya Dipavali |"
        },
        {
         "l": "s7l17",
         "mr": "विष्णुदास नामा, ​विष्णुदास नामा जीवेभावे ओवाळी ।",
         "en": "Vishnudas Naama, Vishnudas Naama Jivebhave Owaali |"
        },
        {
         "l": "s7l18",
         "mr": "हो जीवेभावे ओवाळी ॥",
         "en": "Ho Jivebhave Owaali ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s7l19",
         "rf": true,
         "mr": "येई ओ विठ्ठले माझी माऊली ये ।​<br>येई ओ विठ्ठले माझी माऊली ये ॥ धृ. ॥",
         "en": "Yei O Vitthale Majhi Maauli Ye |<br>Yei O Vitthale Majhi Maauli Ye || Dhr. ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : विष्णुदास नामा</span><span class=\"en\" lang=\"en\">By Vishnudas Nama</span><small><span class=\"mr\">(<a href=\"https://mr.wikipedia.org/wiki/नामदेव\" target=\"_blank\" rel=\"noopener\" aria-label=\"संत नामदेवांची — विकिपीडिया (नवीन टॅबमध्ये उघडेल)\">संत नामदेवांची<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a>, अशीही मान्यता)</span><span class=\"en\" lang=\"en\">(also credited to <a href=\"https://en.wikipedia.org/wiki/Namdev\" target=\"_blank\" rel=\"noopener\" aria-label=\"Sant Namdev: Wikipedia (opens in a new tab)\">Sant Namdev<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a>)</span></small>"
    },
    {
     "id": "a8",
     "no": {
      "mr": "८.",
      "en": "8."
     },
     "title": {
      "mr": "घालीन लोटांगण",
      "en": "Ghalin Lotangan"
     },
     "tag": {
      "mr": "मराठी",
      "en": "Marathi"
     },
     "items": [
      {
       "lines": [
        {
         "l": "s8l1",
         "mr": "घालीन लोटांगण वंदीन चरण ।",
         "en": "Ghalin Lotangan Vandin Charan |"
        },
        {
         "l": "s8l2",
         "mr": "डोळ्यांनी पाहिन रूप तुझें ।",
         "en": "Dolyanni Pahin Roop Tujhe |"
        },
        {
         "l": "s8l3",
         "mr": "प्रेमें आलिंगन आनंदे पूजिन ।",
         "en": "Preme Aalingan Aanande Poojin |"
        },
        {
         "l": "s8l4",
         "mr": "भावें ओवाळिन म्हणे नामा ॥",
         "en": "Bhaave Ovaalin Mhane Naama ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s8l5",
         "mr": "त्वमेव माता च पिता त्वमेव ।",
         "en": "Tvameva Mata Cha Pita Tvameva |"
        },
        {
         "l": "s8l6",
         "mr": "त्वमेव बंधुश्च सखा त्वमेव ।",
         "en": "Tvameva Bandhushcha Sakha Tvameva |"
        },
        {
         "l": "s8l7",
         "mr": "त्वमेव विद्या द्रविणं त्वमेव ।",
         "en": "Tvameva Vidya Dravinam Tvameva |"
        },
        {
         "l": "s8l8",
         "mr": "त्वमेव सर्वं मम देवदेव ॥",
         "en": "Tvameva Sarvam Mama Devadeva ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s8l9",
         "mr": "कायेन वाचा मनसेंद्रियैर्वा ।​<br>बुद्ध्यात्मना वा प्रकृतिस्वभावात् ।",
         "en": "Kayena Vacha Manasendriyairva | <br>Buddhyatmana Va Prakrutisvabhavat |"
        },
        {
         "l": "s8l10",
         "mr": "करोमि यद्यत्सकलं परस्मै ।​<br>नारायणायेति समर्पयामि ॥",
         "en": "Karomi Yadyatsakalam Parasmai | <br>Narayanayeti Samarpayami ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s8l11",
         "mr": "अच्युतं केशवं रामनारायणं ।​<br>कृष्णदामोदरं वासुदेवं हरिम् ।",
         "en": "Achyutam Keshavam Ramanarayanam | <br>Krishnadamodaram Vasudevam Harim |"
        },
        {
         "l": "s8l12",
         "mr": "श्रीधरं माधवं गोपिकावल्लभं ।​<br>जानकीनायकं रामचंद्रं भजे ॥",
         "en": "Shridharam Madhavam Gopikavallabham | <br>Janakinayakam Ramachandram Bhaje ||"
        }
       ]
      },
      {
       "kind": "dh",
       "bold": true,
       "lines": [
        {
         "l": "s8l13",
         "mr": "हरे राम हरे रामराम राम हरे हरे ।",
         "en": "Hare Ram Hare Ram Ram Ram Hare Hare |"
        },
        {
         "l": "s8l14",
         "mr": "हरे कृष्ण हरे कृष्णकृष्ण कृष्ण हरे हरे ॥",
         "en": "Hare Krishna Hare Krishna Krishna Krishna Hare Hare ||"
        },
        {
         "l": "s8l15",
         "rf": true,
         "mr": "हरे राम हरे रामराम राम हरे हरे ।",
         "en": "Hare Ram Hare Ram Ram Ram Hare Hare |"
        },
        {
         "l": "s8l16",
         "rf": true,
         "mr": "हरे कृष्ण हरे कृष्णकृष्ण कृष्ण हरे हरे ॥",
         "en": "Hare Krishna Hare Krishna Krishna Krishna Hare Hare ||"
        },
        {
         "l": "s8l17",
         "rf": true,
         "mr": "हरे राम हरे रामराम राम हरे हरे ।",
         "en": "Hare Ram Hare Ram Ram Ram Hare Hare |"
        },
        {
         "l": "s8l18",
         "rf": true,
         "mr": "हरे कृष्ण हरे कृष्णकृष्ण कृष्ण हरे हरे ॥",
         "en": "Hare Krishna Hare Krishna Krishna Krishna Hare Hare ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ३ वेळा",
        "en": "3 times"
       }
      }
     ],
     "credit": "<span class=\"mr\">संकलन : संत नामदेव व संस्कृत स्तोत्रे</span><span class=\"en\" lang=\"en\">A compilation: Sant Namdev and Sanskrit verses</span>"
    },
    {
     "id": "a9",
     "lang": "hi",
     "no": {
      "mr": "९.",
      "en": "9."
     },
     "title": {
      "mr": "आरती जय गणेश देवा",
      "en": "Aarti Jai Ganesh Deva"
     },
     "tag": {
      "mr": "हिंदी",
      "en": "Hindi"
     },
     "refrain": {
      "label": {
       "mr": "ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)",
       "en": "Refrain (sung after every verse)"
      },
      "lines": [
       {
        "mr": "जय गणेश जय गणेश, जय गणेश देवा ।",
        "en": "Jai Ganesh Jai Ganesh, Jai Ganesh Deva |"
       },
       {
        "mr": "माता जाकी पार्वती, पिता महादेवा ॥",
        "en": "Mata Jaaki Parvati, Pita Mahadeva ||"
       }
      ]
     },
     "items": [
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s9l1",
         "rf": true,
         "mr": "जय गणेश जय गणेश, जय गणेश देवा ।",
         "en": "Jai Ganesh Jai Ganesh, Jai Ganesh Deva |"
        },
        {
         "l": "s9l2",
         "rf": true,
         "mr": "माता जाकी पार्वती, पिता महादेवा ॥",
         "en": "Mata Jaaki Parvati, Pita Mahadeva ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s9l3",
         "mr": "एकदंत दयावंत, चार भुजा धारी ।",
         "en": "Ekadant Dayavant, Chaar Bhuja Dhaari |"
        },
        {
         "l": "s9l4",
         "mr": "माथे सिंदूर सोहे, मूसे की सवारी ॥",
         "en": "Maathe Sindoor Sohe, Moose Ki Savaari ||"
        },
        {
         "l": "s9l5",
         "mr": "पान चढ़े फूल चढ़े, और चढ़े मेवा ।",
         "en": "Paan Chadhe Phool Chadhe, Aur Chadhe Meva |"
        },
        {
         "l": "s9l6",
         "mr": "लड्डुअन का भोग लगे, संत करें सेवा ॥",
         "en": "Ladduan Ka Bhog Lage, Sant Kare Seva ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s9l7",
         "rf": true,
         "mr": "जय गणेश जय गणेश, जय गणेश देवा ।",
         "en": "Jai Ganesh Jai Ganesh, Jai Ganesh Deva |"
        },
        {
         "l": "s9l8",
         "rf": true,
         "mr": "माता जाकी पार्वती, पिता महादेवा ॥",
         "en": "Mata Jaaki Parvati, Pita Mahadeva ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s9l9",
         "mr": "अंधे को आँख देत, कोढ़ी को काया ।",
         "en": "Andhe Ko Aankh Det, Kodhi Ko Kaaya |"
        },
        {
         "l": "s9l10",
         "mr": "बाँझन को पुत्र देत, निर्धन को माया ॥",
         "en": "Baanjhan Ko Putra Det, Nirdhan Ko Maaya ||"
        },
        {
         "l": "s9l11",
         "mr": "सूर श्याम शरण आए, सफल कीजे सेवा ।",
         "en": "Sur Shyam Sharan Aaye, Safal Kije Seva |"
        },
        {
         "l": "s9l12",
         "mr": "माता जाकी पार्वती, पिता महादेवा ॥",
         "en": "Mata Jaaki Parvati, Pita Mahadeva ||"
        }
       ]
      },
      {
       "rmk": {
        "mr": "↻ ध्रुपद",
        "en": "Refrain"
       }
      },
      {
       "kind": "rf",
       "lines": [
        {
         "l": "s9l13",
         "rf": true,
         "mr": "जय गणेश जय गणेश, जय गणेश देवा ।",
         "en": "Jai Ganesh Jai Ganesh, Jai Ganesh Deva |"
        },
        {
         "l": "s9l14",
         "rf": true,
         "mr": "माता जाकी पार्वती, पिता महादेवा ॥",
         "en": "Mata Jaaki Parvati, Pita Mahadeva ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">पारंपरिक</span><span class=\"en\" lang=\"en\">Traditional</span>"
    },
    {
     "id": "a10",
     "lang": "hi",
     "no": {
      "mr": "१०.",
      "en": "10."
     },
     "title": {
      "mr": "आरती जय जगदीश हरे",
      "en": "Aarti Jai Jagdish Hare"
     },
     "tag": {
      "mr": "हिंदी",
      "en": "Hindi"
     },
     "items": [
      {
       "kind": "dh",
       "lines": [
        {
         "l": "s10l1",
         "mr": "ॐ जय जगदीश हरे, ​स्वामी जय जगदीश हरे ।",
         "en": "Om Jai Jagdish Hare, Swami Jai Jagdish Hare |"
        },
        {
         "l": "s10l2",
         "mr": "भक्तजनों के संकट, ​दासजनों के संकट, क्षण में दूर करे ।",
         "en": "Bhaktajanon Ke Sankat, Daasjanon Ke Sankat, Kshan Mein Door Kare |"
        },
        {
         "l": "s10l3",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l4",
         "mr": "जो ध्यावे फल पावे, दुःख बिनसे मन का, ​स्वामी दुःख बिनसे मन का ।",
         "en": "Jo Dhyave Phal Pave, Dukh Binse Man Ka, Swami Dukh Binse Man Ka |"
        },
        {
         "l": "s10l5",
         "mr": "सुख सम्पति घर आवे, ​सुख सम्पति घर आवे, कष्ट मिटे तन का ।",
         "en": "Sukh Sampati Ghar Aave, Sukh Sampati Ghar Aave, Kasht Mite Tan Ka |"
        },
        {
         "l": "s10l6",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l7",
         "mr": "मातपिता तुम मेरे, शरण गहूँ किसकी, ​स्वामी शरण गहूँ किसकी ।",
         "en": "Matapita Tum Mere, Sharan Gahoon Kiski, Swami Sharan Gahoon Kiski |"
        },
        {
         "l": "s10l8",
         "mr": "तुम बिन और न दूजा, ​प्रभु बिन और न दूजा, आस करूँ जिसकी ।",
         "en": "Tum Bin Aur Na Dooja, Prabhu Bin Aur Na Dooja, Aas Karoon Jiski |"
        },
        {
         "l": "s10l9",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l10",
         "mr": "तुम पूरण परमात्मा, ​तुम अन्तर्यामी, स्वामी तुम अन्तर्यामी ।",
         "en": "Tum Pooran Paramatma, Tum Antaryami, Swami Tum Antaryami |"
        },
        {
         "l": "s10l11",
         "mr": "पार ब्रह्म परमेश्वर, ​पार ब्रह्म परमेश्वर, तुम सबके स्वामी ।",
         "en": "Paar Brahma Parmeshwar, Paar Brahma Parmeshwar, Tum Sabke Swami |"
        },
        {
         "l": "s10l12",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l13",
         "mr": "तुम करुणा के सागर, तुम पालन कर्ता, ​स्वामी तुम पालन कर्ता ।",
         "en": "Tum Karuna Ke Sagar, Tum Paalan Karta, Swami Tum Paalan Karta |"
        },
        {
         "l": "s10l14",
         "mr": "मैं मूरख खल कामी, ​मैं सेवक तुम स्वामी, कृपा करो भर्ता ।",
         "en": "Main Moorakh Khal Kaami, Main Sevak Tum Swami, Krupa Karo Bharta |"
        },
        {
         "l": "s10l15",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l16",
         "mr": "तुम हो एक अगोचर, सबके प्राणपति, ​स्वामी सबके प्राणपति ।",
         "en": "Tum Ho Ek Agochar, Sabke Pranpati, Swami Sabke Pranpati |"
        },
        {
         "l": "s10l17",
         "mr": "किस विधि मिलूँ दयामय, ​किस विधि मिलूँ दयामय, तुमको मैं कुमति ।",
         "en": "Kis Vidhi Miloon Dayamay, Kis Vidhi Miloon Dayamay, Tumko Main Kumati |"
        },
        {
         "l": "s10l18",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l19",
         "mr": "दीनबन्धु दुःख हर्ता, तुम रक्षक मेरे, ​स्वामी तुम रक्षक मेरे ।",
         "en": "Deenbandhu Dukh Harta, Tum Rakshak Mere, Swami Tum Rakshak Mere |"
        },
        {
         "l": "s10l20",
         "mr": "अपने हाथ उठाओ, अपने शरण लगाओ, ​द्वार पड़ा तेरे ।",
         "en": "Apne Haath Uthao, Apne Sharan Lagao, Dwar Pada Tere |"
        },
        {
         "l": "s10l21",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l22",
         "mr": "विषय विकार मिटाओ, पाप हरो देवा, ​स्वामी पाप हरो देवा ।",
         "en": "Vishay Vikar Mitao, Paap Haro Deva, Swami Paap Haro Deva |"
        },
        {
         "l": "s10l23",
         "mr": "श्रद्धा भक्ति बढ़ाओ, ​श्रद्धा प्रेम बढ़ाओ, सन्तन की सेवा ।",
         "en": "Shraddha Bhakti Badhao, Shraddha Prem Badhao, Santan Ki Seva |"
        },
        {
         "l": "s10l24",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l25",
         "mr": "तन मन धन सब है तेरा, ​स्वामी सब कुछ है तेरा ।",
         "en": "Tan Man Dhan Sab Hai Tera, Swami Sab Kuch Hai Tera |"
        },
        {
         "l": "s10l26",
         "mr": "तेरा तुझको अर्पण, ​तेरा तुझको अर्पण, क्या लागे मेरा ।",
         "en": "Tera Tujhko Arpan, Tera Tujhko Arpan, Kya Laage Mera |"
        },
        {
         "l": "s10l27",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      },
      {
       "lines": [
        {
         "l": "s10l28",
         "mr": "श्री जगदीशजी की आरती जो कोई नर गावे, ​स्वामी जो कोई नर गावे ।",
         "en": "Shri Jagdishji Ki Aarti Jo Koi Nar Gave, Swami Jo Koi Nar Gave |"
        },
        {
         "l": "s10l29",
         "mr": "कहत शिवानन्द स्वामी, ​मन वांछित फल पावे ।",
         "en": "Kahat Shivanand Swami, Man Vanchit Phal Pave |"
        },
        {
         "l": "s10l30",
         "mr": "ॐ जय जगदीश हरे ॥",
         "en": "Om Jai Jagdish Hare ||"
        }
       ]
      }
     ],
     "credit": "<span class=\"mr\">रचना : <a href=\"https://hi.wikipedia.org/wiki/ओम_जय_जगदीश_हरे\" target=\"_blank\" rel=\"noopener\" aria-label=\"पं. श्रद्धाराम फिल्लौरी — विकिपीडिया (नवीन टॅबमध्ये उघडेल)\">पं. श्रद्धाराम फिल्लौरी<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (सु. १८७०)</span><span class=\"en\" lang=\"en\">By <a href=\"https://en.wikipedia.org/wiki/Om_Jai_Jagdish_Hare\" target=\"_blank\" rel=\"noopener\" aria-label=\"Pt. Shardha Ram Phillauri: Wikipedia (opens in a new tab)\">Pt. Shardha Ram Phillauri<span class=\"crx\" aria-hidden=\"true\"> ↗</span></a> (c. 1870)</span>"
    }
   ]
  }
 ]
};
