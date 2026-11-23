/**
 * Texts of the content update "ganz Wien / Same Day / Express" (2026-11-24), per language:
 * old value (as seeded) → new value. Used by the content migration
 * `2026-11-24-vienna-same-day-express` (src/lib/content-migrations.ts); a value is only
 * replaced while it still equals the old text, so edits made in the admin stay.
 */
/** Phone number change (24/7 by phone and WhatsApp) – migration `2026-11-24-phone-0670`. */
export const OLD_PHONE = "+43 660 6795870";
export const NEW_PHONE = "+43 670 2023515";

export interface ViennaExpressTexts {
  seo: { from: string; to: string };
  announcement: { from: string[]; to: string[] };
  trustDistricts: { from: string; to: string };
  trustCard: { from: { title: string; text: string }; to: { title: string; text: string } };
  eyebrow: { from: string; to: string };
  faq: { question: string; answer: string };
}

export const VIENNA_EXPRESS_TEXTS: Record<string, ViennaExpressTexts> = {
  "de": {
    "seo": {
      "from": "Frisch gebundene Blumen, direkt an die Menschen geliefert, die dir wichtig sind. Wunschdatum wählen, Freude schicken – Blumenversand für Wien.",
      "to": "Blumen liefern lassen in ganz Wien: frisch gebundene Sträuße in alle 23 Bezirke. Same Day bis 18:30 Uhr (sonntags bis 17:45), Express in 1–2 Stunden ohne Aufpreis."
    },
    "announcement": {
      "from": [
        "Blumenlieferung in ganz Wien",
        "Frisch gebunden, per Kurier geliefert",
        "Wunschdatum wählbar"
      ],
      "to": [
        "Lieferung in ganz Wien, alle 23 Bezirke",
        "Express in 1–2 Stunden – ohne Aufpreis",
        "Same Day bis 18:30, sonntags bis 17:45",
        "Frisch gebunden, per Kurier geliefert"
      ]
    },
    "trustDistricts": {
      "from": "In alle 23 Wiener Bezirke",
      "to": "In ganz Wien – alle 23 Bezirke"
    },
    "trustCard": {
      "from": {
        "title": "Grußkarten",
        "text": "Kommen bald"
      },
      "to": {
        "title": "Express in 1–2 Stunden",
        "text": "Ohne Aufpreis, Same Day bis 18:30 Uhr"
      }
    },
    "eyebrow": {
      "from": "Blumenversand Wien",
      "to": "Blumenversand in ganz Wien"
    },
    "faq": {
      "question": "Gibt es eine Express-Lieferung?",
      "answer": "Ja – Express-Lieferung in 1–2 Stunden, ohne Aufpreis. Bestell einfach wie gewohnt und wähle in der Kasse das früheste Zeitfenster von heute – es ist mit „Express“ markiert. Das klappt, wenn du Montag bis Samstag bis 18:30 Uhr oder sonntags bis 17:45 Uhr bestellst und für deine Adresse noch ein Zeitfenster frei ist."
    }
  },
  "en": {
    "seo": {
      "from": "Freshly tied flowers delivered straight to the people who matter to you. Choose your date, send joy – flower delivery in Vienna, Austria.",
      "to": "Flower delivery across all of Vienna: freshly tied bouquets to all 23 districts. Same day until 6:30 pm (Sundays until 5:45 pm), express in 1–2 hours at no extra cost."
    },
    "announcement": {
      "from": [
        "Flower delivery across Vienna",
        "Freshly tied, delivered by courier",
        "Choose your delivery date"
      ],
      "to": [
        "Delivery across Vienna, all 23 districts",
        "Express in 1–2 hours – no extra cost",
        "Same day until 6:30 pm, Sundays 5:45 pm",
        "Freshly tied, delivered by courier"
      ]
    },
    "trustDistricts": {
      "from": "To all 23 districts of Vienna",
      "to": "Across Vienna – all 23 districts"
    },
    "trustCard": {
      "from": {
        "title": "Greeting cards",
        "text": "Coming soon"
      },
      "to": {
        "title": "Express in 1–2 hours",
        "text": "No extra cost, same day until 6:30 pm"
      }
    },
    "eyebrow": {
      "from": "Flower delivery Vienna",
      "to": "Flower delivery across Vienna"
    },
    "faq": {
      "question": "Do you offer express delivery?",
      "answer": "Yes – express delivery in 1–2 hours, at no extra cost. Just order as usual and choose today's earliest time slot at checkout – it is marked “Express”. This works if you order Monday to Saturday by 6:30 pm or on Sundays by 5:45 pm and a time slot is still free for your address."
    }
  },
  "ar": {
    "seo": {
      "from": "زهور منسّقة طازجة تُوصَل مباشرةً إلى من يهمّونكم. اختاروا التاريخ المطلوب وأرسلوا الفرح – خدمة توصيل الزهور في فيينا.",
      "to": "توصيل الزهور في كل أنحاء فيينا: باقات منسّقة طازجة إلى جميع الأحياء الـ23. توصيل في اليوم نفسه حتى 18:30 (الأحد حتى 17:45)، وتوصيل سريع خلال 1–2 ساعة دون تكلفة إضافية."
    },
    "announcement": {
      "from": [
        "توصيل الزهور في كل أنحاء فيينا",
        "منسّقة طازجة وتُوصَل عبر ساعي التوصيل",
        "اختيار التاريخ المطلوب"
      ],
      "to": [
        "توصيل في كل فيينا – جميع الأحياء الـ23",
        "توصيل سريع خلال 1–2 ساعة – دون تكلفة إضافية",
        "في اليوم نفسه حتى 18:30، الأحد حتى 17:45",
        "منسّقة طازجة وتُوصَل عبر ساعي التوصيل"
      ]
    },
    "trustDistricts": {
      "from": "إلى جميع أحياء فيينا الـ23",
      "to": "في كل أنحاء فيينا – جميع الأحياء الـ23"
    },
    "trustCard": {
      "from": {
        "title": "بطاقات التهنئة",
        "text": "قادمة قريبًا"
      },
      "to": {
        "title": "توصيل سريع خلال 1–2 ساعة",
        "text": "دون تكلفة إضافية، وفي اليوم نفسه حتى 18:30"
      }
    },
    "eyebrow": {
      "from": "توصيل الزهور في فيينا",
      "to": "توصيل الزهور في كل أنحاء فيينا"
    },
    "faq": {
      "question": "هل يوجد توصيل سريع؟",
      "answer": "نعم – توصيل سريع خلال 1–2 ساعة دون تكلفة إضافية. اطلبوا كالمعتاد واختاروا عند الدفع أقرب فترة زمنية اليوم – وهي مميّزة بكلمة «سريع». يتم ذلك إذا طلبتم من الاثنين إلى السبت حتى الساعة 18:30 أو يوم الأحد حتى الساعة 17:45 وكانت هناك فترة زمنية متاحة لعنوانكم."
    }
  },
  "bg": {
    "seo": {
      "from": "Свежо аранжирани цветя, доставени директно на хората, които са важни за вас. Изберете желана дата, изпратете радост – доставка на цветя във Виена.",
      "to": "Доставка на цветя в цяла Виена: свежо аранжирани букети във всички 23 района. В същия ден до 18:30 ч. (в неделя до 17:45 ч.), експресно за 1–2 часа без доплащане."
    },
    "announcement": {
      "from": [
        "Доставка на цветя в цяла Виена",
        "Свежо аранжирани, доставени с куриер",
        "Дата на доставка по избор"
      ],
      "to": [
        "Доставка в цяла Виена – всички 23 района",
        "Експресно за 1–2 часа – без доплащане",
        "В същия ден до 18:30 ч., в неделя до 17:45",
        "Свежо аранжирани, доставени с куриер"
      ]
    },
    "trustDistricts": {
      "from": "Във всички 23 района на Виена",
      "to": "В цяла Виена – всички 23 района"
    },
    "trustCard": {
      "from": {
        "title": "Поздравителни картички",
        "text": "Очаквайте скоро"
      },
      "to": {
        "title": "Експресно за 1–2 часа",
        "text": "Без доплащане, в същия ден до 18:30 ч."
      }
    },
    "eyebrow": {
      "from": "Доставка на цветя във Виена",
      "to": "Доставка на цветя в цяла Виена"
    },
    "faq": {
      "question": "Предлагате ли експресна доставка?",
      "answer": "Да – експресна доставка за 1–2 часа, без допълнително заплащане. Просто поръчайте както обикновено и изберете при плащането най-ранния часови интервал за днес – той е отбелязан с „Експресно“. Това е възможно, ако поръчате от понеделник до събота до 18:30 ч. или в неделя до 17:45 ч. и за вашия адрес все още има свободен интервал."
    }
  },
  "bks": {
    "seo": {
      "from": "Svježe aranžirano cvijeće, dostavljeno direktno ljudima koji su Vam važni. Odaberite željeni datum, pošaljite radost – dostava cvijeća za Beč.",
      "to": "Dostava cvijeća u cijelom Beču: svježe aranžirani buketi u sva 23 okruga. Isti dan do 18:30 sati (nedjeljom do 17:45), ekspres za 1–2 sata bez doplate."
    },
    "announcement": {
      "from": [
        "Dostava cvijeća u cijelom Beču",
        "Svježe aranžirano, dostavljeno kurirom",
        "Željeni datum po izboru"
      ],
      "to": [
        "Dostava u cijelom Beču – sva 23 okruga",
        "Ekspres za 1–2 sata – bez doplate",
        "Isti dan do 18:30, nedjeljom do 17:45",
        "Svježe aranžirano, dostavljeno kurirom"
      ]
    },
    "trustDistricts": {
      "from": "U sva 23 bečka okruga",
      "to": "U cijelom Beču – sva 23 okruga"
    },
    "trustCard": {
      "from": {
        "title": "Čestitke",
        "text": "Stižu uskoro"
      },
      "to": {
        "title": "Ekspres za 1–2 sata",
        "text": "Bez doplate, isti dan do 18:30"
      }
    },
    "eyebrow": {
      "from": "Dostava cvijeća Beč",
      "to": "Dostava cvijeća u cijelom Beču"
    },
    "faq": {
      "question": "Imate li ekspresnu dostavu?",
      "answer": "Da – ekspresna dostava za 1–2 sata, bez doplate. Naručite kao i obično i na blagajni odaberite najraniji današnji termin – označen je s „Ekspres“. To je moguće ako naručite od ponedjeljka do subote do 18:30 sati ili nedjeljom do 17:45 sati i za Vašu adresu još ima slobodan termin."
    }
  },
  "ce": {
    "seo": {
      "from": "Керла вовшахтоьхна зезагаш, шуна мехала болчу нахе нийсса дӀакхачадо. Шайна безаш долу де харжа, хазахетар дӀахьажо – Венахь зезагаш дӀакхачор.",
      "to": "Ерриге а Венахь зезагаш дӀакхачор: керла вовшахтоьхна букеташ массо а 23 кӀошта. И де дийнахь 18:30 кхаччалц (кӀиранан дийнахь 17:45 кхаччалц), экспресс 1–2 сахьтехь тӀе ахча доцуш."
    },
    "announcement": {
      "from": [
        "Ерриге а Венахь зезагаш дӀакхачор",
        "Керла вовшахтоьхна, курьеро дӀакхачадо",
        "ДӀакхачоран де харжа мега"
      ],
      "to": [
        "Ерриге а Венахь – массо а 23 кӀошт",
        "Экспресс 1–2 сахьтехь – тӀе ахча доцуш",
        "И де дийнахь 18:30 кхаччалц, кӀиранан дийнахь 17:45 кхаччалц",
        "Керла вовшахтоьхна, курьеро дӀакхачадо"
      ]
    },
    "trustDistricts": {
      "from": "Венан массо а 23 кӀошта",
      "to": "Ерриге а Венахь – массо а 23 кӀошт"
    },
    "trustCard": {
      "from": {
        "title": "Декъалдаран открыткаш",
        "text": "Кестта хир ю"
      },
      "to": {
        "title": "Экспресс 1–2 сахьтехь",
        "text": "ТӀе ахча доцуш, и де дийнахь 18:30 кхаччалц"
      }
    },
    "eyebrow": {
      "from": "Венахь зезагаш дӀакхачор",
      "to": "Ерриге а Венахь зезагаш дӀакхачор"
    },
    "faq": {
      "question": "Экспресс-дӀакхачор дуй?",
      "answer": "ХӀаъ – экспресс-дӀакхачор 1–2 сахьтехь, тӀе ахча доцуш. Даиман санна заказ е, кассехь тахана уггаре хьалхара хенан юкъ харжа – цунна «Экспресс» билгало ю. Иза хуьлу, оршотера шот кхаччалц 18:30 кхаччалц я кӀиранан дийнахь 17:45 кхаччалц заказ йича, шун адресна мукъа хенан юкъ йолуш елахь."
    }
  },
  "es": {
    "seo": {
      "from": "Flores recién atadas, entregadas directamente a las personas que te importan. Elige la fecha, envía alegría: envío de flores en Viena.",
      "to": "Entrega de flores en toda Viena: ramos recién atados a los 23 distritos. En el mismo día hasta las 18:30 (domingos hasta las 17:45), exprés en 1–2 horas sin coste adicional."
    },
    "announcement": {
      "from": [
        "Entrega de flores en toda Viena",
        "Recién atadas, entregadas por mensajero",
        "Elige la fecha de entrega"
      ],
      "to": [
        "Entrega en toda Viena – los 23 distritos",
        "Exprés en 1–2 horas, sin coste adicional",
        "Mismo día hasta las 18:30, domingos 17:45",
        "Recién atadas, entregadas por mensajero"
      ]
    },
    "trustDistricts": {
      "from": "En los 23 distritos de Viena",
      "to": "En toda Viena – los 23 distritos"
    },
    "trustCard": {
      "from": {
        "title": "Tarjetas de dedicatoria",
        "text": "Llegarán pronto"
      },
      "to": {
        "title": "Exprés en 1–2 horas",
        "text": "Sin coste adicional, mismo día hasta las 18:30"
      }
    },
    "eyebrow": {
      "from": "Envío de flores en Viena",
      "to": "Envío de flores en toda Viena"
    },
    "faq": {
      "question": "¿Hay entrega exprés?",
      "answer": "Sí: entrega exprés en 1–2 horas, sin coste adicional. Pide como siempre y elige en el pago la primera franja horaria de hoy; está marcada como «Exprés». Funciona si pides de lunes a sábado hasta las 18:30 o los domingos hasta las 17:45 y aún queda una franja libre para tu dirección."
    }
  },
  "fa": {
    "seo": {
      "from": "گل‌های تازه بسته‌شده، مستقیم برای کسانی که برایتان مهم‌اند. تاریخ دلخواه را انتخاب کنید و شادی بفرستید – ارسال گل در وین.",
      "to": "ارسال گل در سراسر وین: دسته‌گل‌های تازه بسته‌شده به هر 23 منطقه. ارسال همان روز تا ساعت 18:30 (یکشنبه‌ها تا 17:45)، اکسپرس در ۱ تا ۲ ساعت بدون هزینه اضافه."
    },
    "announcement": {
      "from": [
        "ارسال گل در سراسر وین",
        "تازه بسته‌شده، ارسال با پیک",
        "امکان انتخاب تاریخ دلخواه"
      ],
      "to": [
        "ارسال در سراسر وین – هر 23 منطقه",
        "اکسپرس در ۱ تا ۲ ساعت – بدون هزینه اضافه",
        "همان روز تا 18:30، یکشنبه‌ها تا 17:45",
        "تازه بسته‌شده، ارسال با پیک"
      ]
    },
    "trustDistricts": {
      "from": "به هر 23 منطقهٔ وین",
      "to": "در سراسر وین – هر 23 منطقه"
    },
    "trustCard": {
      "from": {
        "title": "کارت تبریک",
        "text": "به‌زودی"
      },
      "to": {
        "title": "اکسپرس در ۱ تا ۲ ساعت",
        "text": "بدون هزینه اضافه، همان روز تا 18:30"
      }
    },
    "eyebrow": {
      "from": "ارسال گل در وین",
      "to": "ارسال گل در سراسر وین"
    },
    "faq": {
      "question": "آیا ارسال اکسپرس دارید؟",
      "answer": "بله – تحویل اکسپرس در ۱ تا ۲ ساعت، بدون هزینه اضافه. مثل همیشه سفارش دهید و هنگام پرداخت زودترین بازهٔ زمانی امروز را انتخاب کنید – با «اکسپرس» مشخص شده است. این کار ممکن است اگر از دوشنبه تا شنبه تا ساعت 18:30 یا یکشنبه‌ها تا ساعت 17:45 سفارش دهید و برای نشانی شما هنوز بازهٔ زمانی آزادی باشد."
    }
  },
  "fr": {
    "seo": {
      "from": "Des fleurs fraîchement composées, livrées directement à ceux qui comptent pour vous. Choisissez la date, offrez du bonheur – livraison de fleurs à Vienne.",
      "to": "Livraison de fleurs dans tout Vienne : bouquets fraîchement composés dans les 23 arrondissements. Le jour même jusqu’à 18 h 30 (dimanche 17 h 45), express en 1 à 2 heures sans supplément."
    },
    "announcement": {
      "from": [
        "Livraison de fleurs dans tout Vienne",
        "Fraîchement composées, livrées par coursier",
        "Date de livraison au choix"
      ],
      "to": [
        "Livraison dans tout Vienne – 23 arrondissements",
        "Express en 1 à 2 h – sans supplément",
        "Le jour même jusqu’à 18 h 30, dim. 17 h 45",
        "Fraîchement composées, livrées par coursier"
      ]
    },
    "trustDistricts": {
      "from": "Dans les 23 arrondissements de Vienne",
      "to": "Dans tout Vienne – les 23 arrondissements"
    },
    "trustCard": {
      "from": {
        "title": "Cartes message",
        "text": "Bientôt disponibles"
      },
      "to": {
        "title": "Express en 1 à 2 heures",
        "text": "Sans supplément, le jour même jusqu’à 18 h 30"
      }
    },
    "eyebrow": {
      "from": "Livraison de fleurs à Vienne",
      "to": "Livraison de fleurs dans tout Vienne"
    },
    "faq": {
      "question": "Proposez-vous une livraison express ?",
      "answer": "Oui – livraison express en 1 à 2 heures, sans supplément. Commandez comme d’habitude et choisissez au paiement le premier créneau du jour – il est marqué « Express ». C’est possible si vous commandez du lundi au samedi jusqu’à 18 h 30 ou le dimanche jusqu’à 17 h 45 et qu’un créneau est encore libre pour votre adresse."
    }
  },
  "hu": {
    "seo": {
      "from": "Frissen kötött virágok közvetlenül azoknak, akik fontosak neked. Válaszd ki a kívánt dátumot, küldj örömöt – virágküldés Bécsben.",
      "to": "Virágkiszállítás egész Bécsben: frissen kötött csokrok mind a 23 kerületbe. Aznapi kiszállítás 18:30-ig (vasárnap 17:45-ig), expressz 1–2 órán belül felár nélkül."
    },
    "announcement": {
      "from": [
        "Virágkiszállítás egész Bécsben",
        "Frissen kötve, futárral kiszállítva",
        "Kívánt dátum választható"
      ],
      "to": [
        "Kiszállítás egész Bécsben – mind a 23 kerület",
        "Expressz 1–2 órán belül – felár nélkül",
        "Aznap 18:30-ig, vasárnap 17:45-ig",
        "Frissen kötve, futárral kiszállítva"
      ]
    },
    "trustDistricts": {
      "from": "Bécs mind a 23 kerületébe",
      "to": "Egész Bécsben – mind a 23 kerület"
    },
    "trustCard": {
      "from": {
        "title": "Üdvözlőkártyák",
        "text": "Hamarosan érkeznek"
      },
      "to": {
        "title": "Expressz 1–2 órán belül",
        "text": "Felár nélkül, aznap 18:30-ig"
      }
    },
    "eyebrow": {
      "from": "Virágküldés Bécsben",
      "to": "Virágküldés egész Bécsben"
    },
    "faq": {
      "question": "Van expressz kiszállítás?",
      "answer": "Igen – expressz kiszállítás 1–2 órán belül, felár nélkül. Rendelj a szokásos módon, és a pénztárnál válaszd a mai legkorábbi idősávot – „Expressz” jelöléssel szerepel. Ez akkor működik, ha hétfőtől szombatig 18:30-ig vagy vasárnap 17:45-ig rendelsz, és a címedre még van szabad idősáv."
    }
  },
  "it": {
    "seo": {
      "from": "Fiori composti freschi, consegnati direttamente alle persone a cui tieni. Scegli la data che preferisci, invia gioia – consegna fiori a Vienna.",
      "to": "Consegna fiori in tutta Vienna: bouquet composti freschi in tutti i 23 distretti. In giornata entro le 18:30 (domenica entro le 17:45), express in 1–2 ore senza sovrapprezzo."
    },
    "announcement": {
      "from": [
        "Consegna fiori in tutta Vienna",
        "Composti freschi, consegnati tramite corriere",
        "Data di consegna a scelta"
      ],
      "to": [
        "Consegna in tutta Vienna – 23 distretti",
        "Express in 1–2 ore – senza sovrapprezzo",
        "In giornata entro le 18:30, domenica 17:45",
        "Composti freschi, consegnati tramite corriere"
      ]
    },
    "trustDistricts": {
      "from": "In tutti i 23 distretti di Vienna",
      "to": "In tutta Vienna – tutti i 23 distretti"
    },
    "trustCard": {
      "from": {
        "title": "Biglietti d'auguri",
        "text": "In arrivo a breve"
      },
      "to": {
        "title": "Express in 1–2 ore",
        "text": "Senza sovrapprezzo, in giornata entro le 18:30"
      }
    },
    "eyebrow": {
      "from": "Consegna fiori a Vienna",
      "to": "Consegna fiori in tutta Vienna"
    },
    "faq": {
      "question": "C'è una consegna express?",
      "answer": "Sì – consegna express in 1–2 ore, senza sovrapprezzo. Ordina come al solito e al pagamento scegli la prima fascia oraria di oggi – è contrassegnata con «Express». Funziona se ordini dal lunedì al sabato entro le 18:30 o la domenica entro le 17:45 e c'è ancora una fascia libera per il tuo indirizzo."
    }
  },
  "pl": {
    "seo": {
      "from": "Świeżo wiązane kwiaty dostarczane prosto do ludzi, którzy są dla ciebie ważni. Wybierz datę, wyślij radość – dostawa kwiatów w Wiedniu.",
      "to": "Dostawa kwiatów w całym Wiedniu: świeżo wiązane bukiety do wszystkich 23 dzielnic. Tego samego dnia do 18:30 (w niedzielę do 17:45), ekspres w 1–2 godziny bez dopłaty."
    },
    "announcement": {
      "from": [
        "Dostawa kwiatów w całym Wiedniu",
        "Świeżo wiązane, dostarczane przez kuriera",
        "Data dostawy do wyboru"
      ],
      "to": [
        "Dostawa w całym Wiedniu – 23 dzielnice",
        "Ekspres w 1–2 godziny – bez dopłaty",
        "Tego samego dnia do 18:30, w niedzielę 17:45",
        "Świeżo wiązane, dostarczane przez kuriera"
      ]
    },
    "trustDistricts": {
      "from": "Do wszystkich 23 dzielnic Wiednia",
      "to": "W całym Wiedniu – wszystkie 23 dzielnice"
    },
    "trustCard": {
      "from": {
        "title": "Kartki z życzeniami",
        "text": "Już wkrótce"
      },
      "to": {
        "title": "Ekspres w 1–2 godziny",
        "text": "Bez dopłaty, tego samego dnia do 18:30"
      }
    },
    "eyebrow": {
      "from": "Dostawa kwiatów Wiedeń",
      "to": "Dostawa kwiatów w całym Wiedniu"
    },
    "faq": {
      "question": "Czy jest dostawa ekspresowa?",
      "answer": "Tak – dostawa ekspresowa w 1–2 godziny, bez dopłaty. Zamów jak zwykle i przy płatności wybierz najwcześniejszy dzisiejszy przedział czasowy – jest oznaczony jako „Ekspres”. Działa to, jeśli zamówisz od poniedziałku do soboty do 18:30 lub w niedzielę do 17:45 i dla twojego adresu jest jeszcze wolny przedział."
    }
  },
  "ro": {
    "seo": {
      "from": "Flori legate proaspăt, livrate direct oamenilor care contează pentru tine. Alege data dorită, trimite bucurie – livrare de flori în Viena.",
      "to": "Livrare de flori în toată Viena: buchete legate proaspăt în toate cele 23 de districte. În aceeași zi până la 18:30 (duminica până la 17:45), express în 1–2 ore fără cost suplimentar."
    },
    "announcement": {
      "from": [
        "Livrare de flori în toată Viena",
        "Legate proaspăt, livrate prin curier",
        "Data dorită la alegere"
      ],
      "to": [
        "Livrare în toată Viena – 23 de districte",
        "Express în 1–2 ore – fără cost suplimentar",
        "În aceeași zi până la 18:30, duminica 17:45",
        "Legate proaspăt, livrate prin curier"
      ]
    },
    "trustDistricts": {
      "from": "În toate cele 23 de districte ale Vienei",
      "to": "În toată Viena – toate cele 23 de districte"
    },
    "trustCard": {
      "from": {
        "title": "Felicitări",
        "text": "În curând"
      },
      "to": {
        "title": "Express în 1–2 ore",
        "text": "Fără cost suplimentar, în aceeași zi până la 18:30"
      }
    },
    "eyebrow": {
      "from": "Livrare flori Viena",
      "to": "Livrare flori în toată Viena"
    },
    "faq": {
      "question": "Aveți livrare express?",
      "answer": "Da – livrare express în 1–2 ore, fără cost suplimentar. Comandă ca de obicei și alege la plată cel mai devreme interval orar de azi – este marcat cu „Express”. Funcționează dacă comanzi de luni până sâmbătă până la ora 18:30 sau duminica până la ora 17:45 și mai este liber un interval pentru adresa ta."
    }
  },
  "ru": {
    "seo": {
      "from": "Свежесобранные цветы с доставкой прямо тем, кто вам дорог. Выберите желаемую дату и подарите радость – доставка цветов по Вене.",
      "to": "Доставка цветов по всей Вене: свежесобранные букеты во все 23 района. В тот же день до 18:30 (в воскресенье до 17:45), экспресс за 1–2 часа без доплаты."
    },
    "announcement": {
      "from": [
        "Доставка цветов по всей Вене",
        "Свежесобранные, с доставкой курьером",
        "Желаемая дата на выбор"
      ],
      "to": [
        "Доставка по всей Вене – все 23 района",
        "Экспресс за 1–2 часа – без доплаты",
        "В тот же день до 18:30, в воскресенье до 17:45",
        "Свежесобранные, с доставкой курьером"
      ]
    },
    "trustDistricts": {
      "from": "Во все 23 района Вены",
      "to": "По всей Вене – все 23 района"
    },
    "trustCard": {
      "from": {
        "title": "Открытки",
        "text": "Скоро появятся"
      },
      "to": {
        "title": "Экспресс за 1–2 часа",
        "text": "Без доплаты, в тот же день до 18:30"
      }
    },
    "eyebrow": {
      "from": "Доставка цветов в Вене",
      "to": "Доставка цветов по всей Вене"
    },
    "faq": {
      "question": "Есть ли экспресс-доставка?",
      "answer": "Да – экспресс-доставка за 1–2 часа, без доплаты. Просто оформите заказ как обычно и при оплате выберите самый ранний интервал на сегодня – он отмечен как «Экспресс». Это возможно, если вы заказываете с понедельника по субботу до 18:30 или в воскресенье до 17:45 и для вашего адреса ещё есть свободный интервал."
    }
  },
  "sk": {
    "seo": {
      "from": "Čerstvo viazané kvety, doručené priamo ľuďom, na ktorých vám záleží. Vyberte želaný dátum, pošlite radosť – doručenie kvetov vo Viedni.",
      "to": "Doručenie kvetov v celej Viedni: čerstvo viazané kytice do všetkých 23 obvodov. V ten istý deň do 18:30 (v nedeľu do 17:45), expres do 1–2 hodín bez príplatku."
    },
    "announcement": {
      "from": [
        "Doručenie kvetov v celej Viedni",
        "Čerstvo viazané, doručené kuriérom",
        "Dátum doručenia podľa vášho výberu"
      ],
      "to": [
        "Doručenie v celej Viedni – 23 obvodov",
        "Expres do 1–2 hodín – bez príplatku",
        "V ten istý deň do 18:30, v nedeľu do 17:45",
        "Čerstvo viazané, doručené kuriérom"
      ]
    },
    "trustDistricts": {
      "from": "Do všetkých 23 viedenských obvodov",
      "to": "V celej Viedni – všetkých 23 obvodov"
    },
    "trustCard": {
      "from": {
        "title": "Pozdravné kartičky",
        "text": "Už čoskoro"
      },
      "to": {
        "title": "Expres do 1–2 hodín",
        "text": "Bez príplatku, v ten istý deň do 18:30"
      }
    },
    "eyebrow": {
      "from": "Doručenie kvetov Viedeň",
      "to": "Doručenie kvetov v celej Viedni"
    },
    "faq": {
      "question": "Ponúkate expresné doručenie?",
      "answer": "Áno – expresné doručenie do 1–2 hodín, bez príplatku. Objednajte ako zvyčajne a pri platbe zvoľte najskoršie dnešné časové okno – je označené ako „Expres“. Funguje to, ak objednáte od pondelka do soboty do 18:30 alebo v nedeľu do 17:45 a pre vašu adresu je ešte voľné okno."
    }
  },
  "tr": {
    "seo": {
      "from": "Taze hazırlanmış çiçekler, doğrudan sizin için önemli olan insanlara teslim edilir. İstediğiniz tarihi seçin, mutluluk gönderin – Viyana için çiçek gönderimi.",
      "to": "Viyana'nın her yerine çiçek teslimatı: taze hazırlanmış buketler 23 bölgenin tamamına. Aynı gün 18:30'a kadar (pazar 17:45'e kadar), 1–2 saatte ekspres, ek ücret yok."
    },
    "announcement": {
      "from": [
        "Viyana'nın her yerine çiçek teslimatı",
        "Taze hazırlanır, kuryeyle teslim edilir",
        "İstediğiniz tarihi seçebilirsiniz"
      ],
      "to": [
        "Viyana'nın her yerine – 23 bölgenin tamamı",
        "1–2 saatte ekspres – ek ücret yok",
        "Aynı gün 18:30'a, pazar 17:45'e kadar",
        "Taze hazırlanır, kuryeyle teslim edilir"
      ]
    },
    "trustDistricts": {
      "from": "Viyana'nın 23 bölgesinin tamamına",
      "to": "Viyana'nın her yerine – 23 bölgenin tamamı"
    },
    "trustCard": {
      "from": {
        "title": "Tebrik kartları",
        "text": "Yakında geliyor"
      },
      "to": {
        "title": "1–2 saatte ekspres",
        "text": "Ek ücret yok, aynı gün 18:30'a kadar"
      }
    },
    "eyebrow": {
      "from": "Viyana'da çiçek gönderimi",
      "to": "Viyana'nın her yerine çiçek gönderimi"
    },
    "faq": {
      "question": "Ekspres teslimat var mı?",
      "answer": "Evet – 1–2 saat içinde ekspres teslimat, ek ücret yok. Her zamanki gibi sipariş verin ve ödeme adımında bugünün en erken zaman aralığını seçin – „Ekspres“ olarak işaretlidir. Pazartesiden cumartesiye 18:30'a kadar ya da pazar günleri 17:45'e kadar sipariş verirseniz ve adresiniz için hâlâ boş bir zaman aralığı varsa bu mümkündür."
    }
  },
  "uk": {
    "seo": {
      "from": "Свіжозібрані квіти, доставлені просто людям, які вам дорогі. Оберіть бажану дату й даруйте радість – доставка квітів у Відні.",
      "to": "Доставка квітів по всьому Відню: свіжозібрані букети в усі 23 райони. Того ж дня до 18:30 (у неділю до 17:45), експрес за 1–2 години без доплати."
    },
    "announcement": {
      "from": [
        "Доставка квітів по всьому Відню",
        "Свіжозібрані, доставлені кур’єром",
        "Бажану дату можна обрати"
      ],
      "to": [
        "Доставка по всьому Відню – усі 23 райони",
        "Експрес за 1–2 години – без доплати",
        "Того ж дня до 18:30, у неділю до 17:45",
        "Свіжозібрані, доставлені кур’єром"
      ]
    },
    "trustDistricts": {
      "from": "У всі 23 райони Відня",
      "to": "По всьому Відню – усі 23 райони"
    },
    "trustCard": {
      "from": {
        "title": "Вітальні листівки",
        "text": "Незабаром"
      },
      "to": {
        "title": "Експрес за 1–2 години",
        "text": "Без доплати, того ж дня до 18:30"
      }
    },
    "eyebrow": {
      "from": "Доставка квітів у Відні",
      "to": "Доставка квітів по всьому Відню"
    },
    "faq": {
      "question": "Чи є експрес-доставка?",
      "answer": "Так – експрес-доставка за 1–2 години, без доплати. Просто замовте як зазвичай і під час оплати оберіть найраніший інтервал на сьогодні – він позначений як «Експрес». Це можливо, якщо ви замовляєте з понеділка по суботу до 18:30 або в неділю до 17:45 і для вашої адреси ще є вільний інтервал."
    }
  }
};
