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

// 2. نظام الخصوصية: كلمة السر والمعرف الفريد
let userId = localStorage.getItem('medPulse_uid');
if (!userId) {
    let pass = prompt("🔐 مرحباً بك! عيّن كلمة سر خاصة بك لحماية قائمة أدويتك:");
    if (pass) {
        userId = pass;
        localStorage.setItem('medPulse_uid', userId);
    } else {
        userId = "guest_" + Math.floor(Math.random() * 1000);
    }
}

// 3. إعداد الصوت وتجهيزه للعمل في الخلفية (مهم للأيفون)
const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
alarmSound.loop = true;

// دالة لتجهيز الصوت عند أول لمسة
document.body.addEventListener('click', () => {
    alarmSound.play().then(() => { alarmSound.pause(); }).catch(e => console.log("Audio Init"));
    if (Notification.permission === "default") { Notification.requestPermission(); }
}, { once: true });

// 4. ميزة "مثل فيسبوك": مسح الإشعار فور دخول التطبيق
window.onfocus = () => {
    stopAlarmAction();
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// 5. إضافة منبه جديد
document.getElementById('addBtn').onclick = () => {
    const medInput = document.getElementById('medicineName');
    const timeInput = document.getElementById('alarmTime');
    const name = medInput.value;
    const time = timeInput.value;

    if (name && time) {
        push(ref(db, `alarms/${userId}`), { name, time });
        medInput.value = "";
        timeInput.value = "";
    } else {
        alert("الرجاء إدخال البيانات كاملة.");
    }
};

// 6. عرض المنبهات السحابية
onValue(ref(db, `alarms/${userId}`), (snapshot) => {
    const list = document.getElementById('alarmsList');
    list.innerHTML = "";
    const data = snapshot.val();
    for (let id in data) {
        const item = document.createElement('div');
        item.className = 'alarm-item';
        item.innerHTML = `
            <div class="alarm-info">
                <b class="glow-text">💊 ${data[id].name}</b>
                <span>⏰ الموعد: ${data[id].time}</span>
            </div>`;
        const delBtn = document.createElement('button');
        delBtn.innerText = "حذف";
        delBtn.className = "delete-btn";
        delBtn.onclick = () => remove(ref(db, `alarms/${userId}/${id}`));
        item.appendChild(delBtn);
        list.appendChild(item);
    }
});

// 7. الفحص الدوري والتشغيل اللحظي
setInterval(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (now.getSeconds() === 0) {
        onValue(ref(db, `alarms/${userId}`), (snapshot) => {
            const data = snapshot.val();
            for (let id in data) {
                if (data[id].time === currentTime) {
                    triggerAlarmNotification(data[id].name);
                }
            }
        }, { onlyOnce: true });
    }
}, 1000);

// 8. دالة التنبيه (صوت + إشعار منبثق)
function triggerAlarmNotification(medName) {
    alarmSound.currentTime = 0;
    alarmSound.play();

    const stopBtn = document.getElementById('stopSoundBtn');
    if (stopBtn) {
        stopBtn.classList.remove('hidden');
        stopBtn.classList.add('pulse-animation');
    }

    if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("MedPulse: موعد الدواء!", {
                body: `🚨 حان الآن موعد جرعة: ${medName}\nإضغط هنا للإيقاف.`,
                icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
                tag: "med-alert",
                requireInteraction: true,
                vibrate: [200, 100, 200],
                data: { url: window.location.href }
            });
        });
    }
}

// 9. دالة الإيقاف
function stopAlarmAction() {
    alarmSound.pause();
    const stopBtn = document.getElementById('stopSoundBtn');
    if (stopBtn) { stopBtn.classList.add('hidden'); }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            reg.getNotifications({ tag: 'med-alert' }).then(notifications => {
                notifications.forEach(n => n.close());
            });
        });
    }
}

document.getElementById('stopSoundBtn').onclick = stopAlarmAction;
