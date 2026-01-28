import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. إعدادات Firebase
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

// 2. نظام الخصوصية الموحد (كلمة السر)
let userId = localStorage.getItem('medPulse_uid');
if (!userId) {
    let pass = prompt("🔐 إعداد الأمان: أدخل كلمة سر خاصة بك للوصول لأدويتك من أي جهاز:");
    if (pass && pass.trim() !== "") {
        userId = pass.trim();
        localStorage.setItem('medPulse_uid', userId);
    } else {
        userId = "user_" + Math.floor(Math.random() * 10000);
        localStorage.setItem('medPulse_uid', userId);
    }
}

// 3. محرك الصوت (متوافق مع قيود الأيفون والويندوز)
const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
alarmSound.loop = true;
alarmSound.preload = 'auto';

// تفعيل الصوت والإشعارات عند أول لمسة (ضروري لـ iOS و Windows Chrome)
const initializeMedia = () => {
    alarmSound.play().then(() => {
        alarmSound.pause();
        console.log("تم تهيئة نظام الصوت لكل الأنظمة");
    }).catch(e => console.log("بانتظار تفاعل المستخدم..."));

    if ("Notification" in window) {
        Notification.requestPermission();
    }
};
document.body.addEventListener('click', initializeMedia, { once: true });
document.body.addEventListener('touchstart', initializeMedia, { once: true });

// 4. تسجيل الـ Service Worker لضمان عمل الإشعارات "اللحظية"
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        console.log("Service Worker Active ✅");
    });
}

// 5. إضافة دواء جديد
document.getElementById('addBtn').onclick = () => {
    const medName = document.getElementById('medicineName').value;
    const medTime = document.getElementById('alarmTime').value;

    if (medName && medTime) {
        push(ref(db, `alarms/${userId}`), { name: medName, time: medTime });
        alert("📍 تم تفعيل المنبه اللحظي سحابياً");
    } else {
        alert("يرجى ملء البيانات");
    }
};

// 6. عرض المنبهات (تحديث تلقائي لجميع الأجهزة)
onValue(ref(db, `alarms/${userId}`), (snapshot) => {
    const list = document.getElementById('alarmsList');
    list.innerHTML = "";
    const data = snapshot.val();
    for (let id in data) {
        const item = document.createElement('div');
        item.className = 'alarm-item animated-entry';
        item.innerHTML = `<div><b>💊 ${data[id].name}</b> - ⏰ ${data[id].time}</div>`;
        const delBtn = document.createElement('button');
        delBtn.innerText = "حذف";
        delBtn.onclick = () => remove(ref(db, `alarms/${userId}/${id}`));
        item.appendChild(delBtn);
        list.appendChild(item);
    }
});

// 7. نظام المراقبة اللحظي (Precision Timer)
setInterval(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (now.getSeconds() === 0) {
        onValue(ref(db, `alarms/${userId}`), (snapshot) => {
            const data = snapshot.val();
            for (let id in data) {
                if (data[id].time === currentTime) {
                    triggerGlobalAlarm(data[id].name);
                }
            }
        }, { onlyOnce: true });
    }
}, 1000);

// 8. تشغيل التنبيه اللحظي (Notification + Sound)
function triggerGlobalAlarm(name) {
    // تشغيل الصوت (يعمل على الويندوز والأندرويد فوراً، وعلى الأيفون إذا كان PWA)
    alarmSound.currentTime = 0;
    alarmSound.play().catch(() => console.log("فشل تشغيل الصوت تلقائياً"));

    document.getElementById('stopSoundBtn').classList.remove('hidden');

    // إرسال الإشعار اللحظي
    if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            const options = {
                body: `🚨 حان وقت جرعة: ${name}\nاضغط هنا لفتح التطبيق وإيقاف الرنين.`,
                icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
                tag: "med-alert",
                requireInteraction: true, // يبقى ظاهراً في الويندوز والأندرويد
                vibrate: [500, 100, 500],
                data: { url: window.location.origin + window.location.pathname }
            };
            reg.showNotification("MedPulse Alarm", options);
        });
    }
}

// 9. ميزة "مثل فيسبوك": تنظيف الإشعارات عند العودة للتطبيق
const clearAlarm = () => {
    alarmSound.pause();
    document.getElementById('stopSoundBtn').classList.add('hidden');
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            reg.getNotifications({ tag: 'med-alert' }).then(notifs => notifs.forEach(n => n.close()));
        });
    }
};

window.onfocus = clearAlarm;
document.getElementById('stopSoundBtn').onclick = clearAlarm;
