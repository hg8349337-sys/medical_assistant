import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// إعدادات Firebase الخاصة بك (بقيت كما هي)
const firebaseConfig = {
    apiKey: "AIzaSyDYV2c9_PAcla_7btxKA7L7nHWmroD94zQ",
    authDomain: "myalarmapp-26e3e.firebaseapp.com",
    databaseURL: "https://myalarmapp-26e3e-default-rtdb.firebaseio.com",
    projectId: "myalarmapp-26e3e",
    storageBucket: "myalarmapp-26e3e.firebasestorage.app",
    messagingSenderId: "790274373412",
    appId: "1:790274373412:web:272afc4b52e09b396ce5b1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const userId = "user_one";

// إعداد الصوت الخاص بالتنبيه
const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
alarmSound.loop = true;

// 1. عند فتح الموقع: اجعل التركيز فوراً على حقل اسم الدواء
window.onload = () => {
    const medInput = document.getElementById('medicineName');
    if (medInput) medInput.focus();
};

// تسجيل الـ Service Worker للعمل في الخلفية
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// إضافة منبه جديد
document.getElementById('addBtn').onclick = () => {
    const medInput = document.getElementById('medicineName');
    const timeInput = document.getElementById('alarmTime');
    const name = medInput.value;
    const time = timeInput.value;

    if (name && time) {
        Notification.requestPermission().then(p => {
            if (p === 'granted') {
                // دفع البيانات إلى Firebase
                push(ref(db, 'alarms/' + userId), { name, time });

                // تأثير بصري عند الإضافة (إعادة تصفير الحقول وإعادة التركيز)
                medInput.value = "";
                timeInput.value = "";
                medInput.focus();
            } else {
                alert("يرجى تفعيل الإشعارات لتلقي تنبيهات الدواء!");
            }
        });
    } else {
        alert("الرجاء إدخال اسم الدواء وتحديد الوقت.");
    }
};

// جلب وعرض المنبهات من السحاب وتحديث القائمة
onValue(ref(db, 'alarms/' + userId), (snapshot) => {
    const data = snapshot.val();
    const list = document.getElementById('alarmsList');
    list.innerHTML = "";

    if (data) {
        for (let id in data) {
            const item = document.createElement('div');
            item.className = 'alarm-item animated-entry'; // كلاس للأنيميشن والظهور المتدرج
            item.innerHTML = `
                <div class="alarm-info">
                    <b class="glow-text">💊 ${data[id].name}</b>
                    <span class="time-tag">⏰ الموعد: ${data[id].time}</span>
                </div>`;

            const delBtn = document.createElement('button');
            delBtn.innerText = "حذف الموعد";
            delBtn.className = "delete-btn";
            delBtn.onclick = () => {
                // إيقاف الصوت إذا كان يعمل عند حذف المنبه
                alarmSound.pause();
                remove(ref(db, `alarms/${userId}/${id}`));
            };

            item.appendChild(delBtn);
            list.appendChild(item);
        }
    }
});

// نظام فحص الوقت (دقيق جداً يعمل كل ثانية)
setInterval(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (now.getSeconds() === 0) { // الفحص يتم في بداية كل دقيقة فقط
        onValue(ref(db, 'alarms/' + userId), (snapshot) => {
            const data = snapshot.val();
            for (let id in data) {
                if (data[id].time === currentTime) {
                    playAlarm(data[id].name);
                }
            }
        }, { onlyOnce: true });
    }
}, 1000);

// تشغيل التنبيه (صوت + إشعار نظام)
function playAlarm(name) {
    alarmSound.play().catch(e => console.log("المتصفح يحتاج تفاعل لتشغيل الصوت"));

    const stopBtn = document.getElementById('stopSoundBtn');
    if (stopBtn) stopBtn.classList.remove('hidden');

    navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(`🚨 حان موعد دواء: ${name}`, {
            body: "يرجى تناول جرعتك الآن للحفاظ على صحتك.",
            icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
            vibrate: [500, 110, 500, 110, 500],
            requireInteraction: true // يمنع اختفاء الإشعار تلقائياً
        });
    });
}

// زر إيقاف الصوت
document.getElementById('stopSoundBtn').onclick = () => {
    alarmSound.pause();
    alarmSound.currentTime = 0;
    document.getElementById('stopSoundBtn').classList.add('hidden');
};