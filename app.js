import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. إعدادات Firebase الخاصة بك
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

// 2. نظام الخصوصية: استرجاع أو إنشاء معرف مستخدم فريد
let userId = localStorage.getItem('medPulse_uid');
if (!userId) {
    userId = prompt("مرحباً بك! أدخل اسماً خاصاً أو رقماً سرياً لحماية أدويتك (لن يراها غيرك):") || "guest_" + Math.floor(Math.random() * 1000);
    localStorage.setItem('medPulse_uid', userId);
}

// 3. إعداد صوت المنبه
const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
alarmSound.loop = true;

// 4. تفعيل الإشعارات والتركيز التلقائي وتنظيف التنبيهات عند الدخول
window.onload = () => {
    const medInput = document.getElementById('medicineName');
    if (medInput) medInput.focus();
};

// ميزة "مثل فيسبوك": تنظيف الإشعارات والصوت فور دخول المستخدم للتطبيق
window.onfocus = () => {
    stopAlarmAction();
};

// تعديل هام للأيفون: طلب الإذن وتفعيل الصوت بضغطة واحدة
document.body.addEventListener('click', () => {
    alarmSound.play().then(() => {
        alarmSound.pause(); 
    }).catch(e => console.log("Audio prep ready"));

    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
}, { once: true });

// تسجيل الـ Service Worker
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
        medInput.focus();
    } else {
        alert("الرجاء إدخال اسم الدواء والوقت.");
    }
};

// 6. جلب وعرض المنبهات
onValue(ref(db, `alarms/${userId}`), (snapshot) => {
    const list = document.getElementById('alarmsList');
    list.innerHTML = "";
    const data = snapshot.val();

    for (let id in data) {
        const item = document.createElement('div');
        item.className = 'alarm-item animated-entry';
        item.innerHTML = `
            <div class="alarm-info">
                <b class="glow-text">💊 ${data[id].name}</b>
                <span>⏰ الموعد: ${data[id].time}</span>
            </div>`;

        const delBtn = document.createElement('button');
        delBtn.innerText = "حذف";
        delBtn.className = "delete-btn";
        delBtn.onclick = () => {
            stopAlarmAction(); 
            remove(ref(db, `alarms/${userId}/${id}`));
        };

        item.appendChild(delBtn);
        list.appendChild(item);
    }
});

// 7. نظام الفحص الدوري
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

// 8. دالة تشغيل التنبيه (مع خصائص الإشعار المستمر)
function triggerAlarmNotification(medName) {
    alarmSound.currentTime = 0;
    alarmSound.play().catch(e => console.log("التفاعل مطلوب"));

    const stopBtn = document.getElementById('stopSoundBtn');
    if (stopBtn) {
        stopBtn.classList.remove('hidden');
        stopBtn.classList.add('pulse-animation');
    }

    if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            const options = {
                body: `🚨 موعد دواء: ${medName}\nاضغط للدخول والإيقاف.`,
                icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
                badge: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
                tag: "med-alert",
                renotify: true,
                requireInteraction: true, 
                vibrate: [200, 100, 200, 100, 200],
                data: { url: window.location.href } // تمرير الرابط لفتحه عند الضغط
            };
            reg.showNotification("تنبيه MedPulse الذكي", options);
        });
    }
}

// 9. دالة إيقاف التنبيه وتنظيف الإشعارات
function stopAlarmAction() {
    alarmSound.pause();
    alarmSound.currentTime = 0;
    const stopBtn = document.getElementById('stopSoundBtn');
    if (stopBtn) {
        stopBtn.classList.add('hidden');
        stopBtn.classList.remove('pulse-animation');
    }

    // حذف الإشعارات من شريط التنبيهات (الأندرويد والأيفون)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            reg.getNotifications({ tag: 'med-alert' }).then(notifications => {
                notifications.forEach(n => n.close());
            });
        });
    }
}

// ربط الزر
document.getElementById('stopSoundBtn').onclick = stopAlarmAction;
