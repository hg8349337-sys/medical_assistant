import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const userId = "master_user_01"; 
const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
alarmSound.loop = true;

// 1. تسجيل الـ Service Worker فوراً
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        console.log("Service Worker Registered for iOS");
    });
}

// 2. دالة "الإلحاح" المخصصة للآيفون (تُستدعى عند أول ضغطة)
async function enableIOSNotifications() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // إجبار المتصفح على الربط مع محرك الإشعارات
            const reg = await navigator.serviceWorker.ready;
            if ('index' in reg) { // التأكد من وجود Content Indexing لزيادة الأولوية
                console.log("iOS Indexing Ready");
            }
        }
    }
}

// فك حظر الصوت والإشعارات (iOS يتطلب ضغطة صريحة)
document.body.addEventListener('click', () => {
    enableIOSNotifications(); // تفعيل الإلحاح للآيفون
    alarmSound.play().then(() => alarmSound.pause()); 
}, { once: true });

// إضافة موعد
document.getElementById('addBtn').addEventListener('click', () => {
    const name = document.getElementById('medicineName').value;
    const time = document.getElementById('alarmTime').value;
    if (name && time) {
        push(ref(db, `alarms/${userId}`), { name, time });
        document.getElementById('medicineName').value = "";
    }
});

// عرض القائمة مع الحذف
onValue(ref(db, `alarms/${userId}`), (snapshot) => {
    const list = document.getElementById('alarmsList');
    list.innerHTML = "";
    const data = snapshot.val();
    for (let id in data) {
        const div = document.createElement('div');
        div.style = "background:rgba(255,255,255,0.05); padding:15px; border-radius:15px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border: 1px solid rgba(0,243,255,0.2);";
        div.innerHTML = `<div><b style="color:#00f3ff">${data[id].name}</b><br><small>⏰ ${data[id].time}</small></div>`;
        const btn = document.createElement('button');
        btn.innerText = "حذف"; btn.style = "background:none; border:1px solid #ff00c1; color:#ff00c1; border-radius:8px; cursor:pointer; padding:5px 10px;";
        btn.onclick = () => remove(ref(db, `alarms/${userId}/${id}`));
        div.appendChild(btn);
        list.appendChild(div);
    }
});

// نظام فحص الوقت
setInterval(() => {
    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (now.getSeconds() === 0) {
        onValue(ref(db, `alarms/${userId}`), (snap) => {
            const data = snap.val();
            for (let id in data) {
                if (data[id].time === curTime) {
                    triggerAlarmNotification(data[id].name);
                }
            }
        }, { onlyOnce: true });
    }
}, 1000);

// دالة التنبيه المعدلة للآيفون (Native Banner)
function triggerAlarmNotification(name) {
    alarmSound.play();
    document.getElementById('alarmOverlay').classList.remove('hidden');
    document.getElementById('activeMedName').innerText = "جرعة: " + name;

    if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(`🚨 موعد دواء: ${name}`, {
                body: "اضغط للدخول وإيقاف الرنين فوراً",
                icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
                badge: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
                tag: 'med-alert-' + name, // Tag فريد لكل دواء لضمان الانبثاق
                requireInteraction: true, // يمنع اختفاء الإشعار تلقائياً في iOS
                vibrate: [200, 100, 200]
            });
        });
    }
}

document.getElementById('stopSoundBtn').onclick = () => {
    alarmSound.pause();
    alarmSound.currentTime = 0;
    document.getElementById('alarmOverlay').classList.add('hidden');
};

window.onfocus = () => {
    if (!alarmSound.paused) document.getElementById('alarmOverlay').classList.remove('hidden');
};
