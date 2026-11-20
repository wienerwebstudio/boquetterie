import type { PartialMessages } from "@/i18n/messages";

/** pl – pay (translated from src/i18n/messages/de/pay.ts). */
const pay: NonNullable<PartialMessages["pay"]> = {
  inline: {
    loading: "Ładowanie pola płatności …",
    loadFailed: "Nie udało się załadować pola płatności. Odśwież stronę, spróbuj innej przeglądarki lub wybierz inną metodę płatności. Nic nie zostało pobrane.",
    redirectHint: "Po kliknięciu „Kup teraz” potwierdzasz płatność w {method}.",
    walletHint: "Po kliknięciu „Kup teraz” potwierdzasz płatność przez {method}.",
    amountChanged: "Łączna kwota wynosi teraz {total} (np. z powodu opłaty za dostawę lub kuponu). Sprawdź ją i kliknij przycisk jeszcze raz – nic nie zostało pobrane.",
    failed: "Płatność się nie powiodła: {reason} Twoje zamówienie {orderId} zostało zapisane, ale nie jest jeszcze opłacone – spróbuj ponownie lub wybierz inną metodę płatności.",
    retry: "Wprowadź ponownie dane płatności i jeszcze raz kliknij przycisk.",
  },
  express: {
    title: "Zakup ekspresowy",
    intro: "Zamów od razu przez Apple Pay, Google Pay lub Link – adres dostawy i dane kontaktowe pochodzą z Twojego portfela.",
    postalCode: "Kod pocztowy odbiorcy",
    date: "Dzień dostawy",
    window: "Przedział czasowy",
    choose: "Wybierz",
    needPostalCode: "Najpierw wpisz kod pocztowy odbiorcy.",
    needSlot: "Najpierw wybierz dzień dostawy i przedział czasowy.",
    noDays: "Dla tego kodu pocztowego nie ma obecnie wolnego dnia dostawy.",
    errors: {
      zone: "Niestety nie dostarczamy pod ten kod pocztowy. Wybierz adres w naszym obszarze dostaw.",
      date: "Wybrany dzień dostawy nie jest dostępny dla tego adresu. Wybierz inny dzień.",
      window: "Wybrany przedział czasowy nie jest dostępny dla tego adresu. Wybierz inny.",
      minOrder: "Dla tego obszaru dostaw obowiązuje minimalna wartość zamówienia – przejdź do kasy.",
      items: "Jeden z produktów jest obecnie niedostępny. Sprawdź koszyk.",
      coupon: "Kupon jest nieważny. Usuń go lub przejdź do kasy.",
      address: "Wybierz w portfelu pełny adres dostawy z numerem domu, adres e-mail i numer telefonu.",
      amountChanged: "Kwota właśnie się zmieniła. Rozpocznij zakup ekspresowy jeszcze raz – nic nie zostało pobrane.",
      failed: "Płatność ekspresowa się nie powiodła. Nic nie zostało pobrane – spróbuj ponownie lub przejdź do kasy.",
      connection: "Brak połączenia. Sprawdź połączenie z internetem i spróbuj ponownie.",
    },
    goods: "Kwiaty i dodatki",
    shipping: "Dostawa {date}",
    shippingWindow: "Dostawa {date}, {window}",
    legal: "Płacąc Apple Pay, Google Pay lub Link, składasz zamówienie z obowiązkiem zapłaty. Obowiązuje nasz {terms} oraz {withdrawal}. W przypadku świeżych kwiatów ciętych prawo odstąpienia nie przysługuje.",
    terms: "Regulamin",
    withdrawal: "Pouczenie o odstąpieniu od umowy",
  },
};

export default pay;
