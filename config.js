/* Налаштування сайту. Відредагуйте цей файл один раз (див. ІНСТРУКЦІЯ.md, крок 6). */

/* 1. Вставте сюди блок firebaseConfig із консолі Firebase (значення в лапках). */
window.FIREBASE_CONFIG = {
  apiKey: "ВСТАВТЕ_СЮДИ",
  authDomain: "ВСТАВТЕ_СЮДИ",
  projectId: "ВСТАВТЕ_СЮДИ",
  storageBucket: "ВСТАВТЕ_СЮДИ",
  messagingSenderId: "ВСТАВТЕ_СЮДИ",
  appId: "ВСТАВТЕ_СЮДИ"
};

/* 2. Логіни трьох розділів. Створіть у Firebase користувачів саме з такими адресами.
      Якщо змінюєте їх тут, змініть і у файлі firestore.rules. */
window.ROLE_EMAILS = {
  director: "director@zadachi.example",
  vyrobnytstvo: "vyrobnytstvo@zadachi.example",
  administratsiia: "administratsiia@zadachi.example"
};
