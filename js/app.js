// State
let currentStep = 1;
let selectedCourse = null;
let selectedDate = null;
let selectedTime = null;
let coursesCache = {}; // Cache for course data

// Render Stepper
function renderStepper() {
    const steps = [
        { num: 1, text: "選擇課程" },
        { num: 2, text: "查詢時段" },
        { num: 3, text: "填寫資料" }
    ];

    let html = '<div class="flex items-center w-full max-w-2xl">';
    steps.forEach((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isActive = step.num === currentStep;

        // Circle
        let circleClass = "w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ";
        if (isCompleted) circleClass += "bg-green-500 border-green-500 text-white";
        else if (isActive) circleClass += "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100";
        else circleClass += "bg-white border-gray-300 text-gray-400";

        // Text
        let textClass = "absolute top-12 text-xs font-bold w-20 text-center ";
        textClass += isActive || isCompleted ? "text-gray-800" : "text-gray-400";

        html += `
            <div class="relative flex flex-col items-center z-10">
                <div class="${circleClass}">
                    ${isCompleted ? '<i class="fa-solid fa-check"></i>' : step.num}
                </div>
                <div class="${textClass}">${step.text}</div>
            </div>
        `;

        // Line
        if (idx < steps.length - 1) {
            let lineClass = "flex-1 h-1 mx-2 transition-all duration-500 ";
            lineClass += isCompleted ? "bg-green-500" : "bg-gray-200";
            html += `<div class="${lineClass}"></div>`;
        }
    });
    html += '</div>';
    document.getElementById('stepperContainer').innerHTML = html;
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
    // Check if libraries are loaded
    if (typeof firebase === 'undefined' || typeof emailjs === 'undefined') {
        console.error('Firebase or EmailJS not loaded');
        alert('系統載入失敗，請檢查網路連線或稍後再試');
        return;
    }

    // Ensure db and auth are available
    if (!window.db) window.db = firebase.firestore();
    if (!window.auth) window.auth = firebase.auth();

    renderStepper();
    await loadCourses();

    // Date Picker Listener
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        // Set min date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];

        dateInput.addEventListener('change', async (e) => {
            selectedDate = e.target.value;
            if (selectedDate) {
                await checkAvailability(selectedDate);
            }
        });
    }
});

async function loadCourses() {
    const list = document.getElementById('course-list');
    if (!list) return;

    try {
        const snapshot = await db.collection('courses').get();
        if (snapshot.empty) {
            list.innerHTML = `<div class="col-span-full text-center">目前沒有課程，請至後台新增。</div>`;
            return;
        }

        let html = '';
        coursesCache = {}; // Reset cache

        snapshot.forEach(doc => {
            const data = doc.data();
            coursesCache[doc.id] = { ...data, id: doc.id }; // Store in cache

            // Generate Tags HTML
            let tagsHtml = '';
            if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
                tagsHtml = data.tags.map(tag =>
                    `<span class="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full ml-2">${tag}</span>`
                ).join('');
            }

            html += `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition flex flex-col">
                <div class="relative w-full pb-[56.25%] bg-gray-200 cursor-pointer group overflow-hidden" 
                        onclick="openCourseDetail('${doc.id}')">
                        <img src="${data.image || 'https://via.placeholder.com/800x450?text=Course'}" 
                            alt="${data.title}" 
                            class="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105">
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                        <i class="fa-solid fa-eye text-white opacity-0 group-hover:opacity-100 text-3xl transition transform scale-50 group-hover:scale-100"></i>
                        </div>
                </div>
                <div class="p-6 flex-1 flex flex-col">
                    <div class="flex justify-between items-center mb-2">
                        <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">${data.category || '演講'}</span>
                        <span class="text-gray-500 text-xs flex-shrink-0 ml-2"><i class="fa-regular fa-clock"></i> ${data.duration}</span>
                    </div>
                    <div class="flex items-center flex-wrap gap-y-1 mb-2 h-6 overflow-hidden">
                        ${tagsHtml}
                    </div>
                    <h3 class="text-xl font-bold mb-2 text-gray-900 cursor-pointer hover:text-blue-600 truncate" onclick="openCourseDetail('${doc.id}')">${data.title}</h3>
                    <div class="flex-1"></div>
                    <button onclick="openCourseDetail('${doc.id}')" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">詳細內容</button>
                </div>
            </div>`;
        });
        list.innerHTML = html;
    } catch (error) {
        console.error(error);
        list.innerHTML = "載入失敗";
    }
}

function openCourseDetail(id) {
    const course = coursesCache[id];
    if (!course) return;

    // Populate Modal Data
    const imgEl = document.getElementById('modal-course-img');
    if (imgEl) imgEl.src = course.image || 'https://via.placeholder.com/800x450?text=Course';

    const titleEl = document.getElementById('modal-course-title');
    if (titleEl) titleEl.innerText = course.title;

    const catEl = document.getElementById('modal-course-category');
    if (catEl) catEl.innerText = course.category || '一般';

    const durEl = document.getElementById('modal-course-duration');
    if (durEl) durEl.innerText = course.duration;

    const descEl = document.getElementById('modal-course-desc');
    if (descEl) descEl.innerText = course.description;

    // Populate Requirements
    let reqSection = document.getElementById('modal-req-section');
    if (!reqSection) {
        // If the section doesn't exist yet (first run), create it
        const descP = document.getElementById('modal-course-desc');
        if (descP && descP.parentNode) {
            reqSection = document.createElement('div');
            reqSection.id = 'modal-req-section';
            reqSection.className = 'hidden mt-6';
            reqSection.innerHTML = `
                <h4 class="font-bold text-gray-800 mb-2">備註說明</h4>
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
                    <p id="modal-course-req" class="whitespace-pre-line text-yellow-800"></p>
                </div>
            `;
            descP.parentNode.insertBefore(reqSection, descP.nextSibling);
        }
    }

    const reqText = document.getElementById('modal-course-req');

    if (reqText && course.requirements && course.requirements.trim() !== "") {
        reqText.innerText = course.requirements;
        if (reqSection) reqSection.classList.remove('hidden');
    } else {
        if (reqSection) reqSection.classList.add('hidden');
    }

    // Populate Modal Tags
    const tagsContainer = document.getElementById('modal-course-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (course.tags && Array.isArray(course.tags) && course.tags.length > 0) {
            const tagsHtml = course.tags.map(tag =>
                `<span class="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">${tag}</span>`
            ).join('');
            tagsContainer.innerHTML = tagsHtml;
        }
    }

    // Setup Book Button in Modal
    const btn = document.getElementById('modal-book-btn');
    if (btn) {
        btn.onclick = function () {
            closeCourseDetail();
            selectCourse(course.id, course.title);
        };
    }

    // Show Modal
    const modal = document.getElementById('public-course-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeCourseDetail() {
    const modal = document.getElementById('public-course-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

function changeStep(step) {
    currentStep = step;

    // Hide all views
    ['view-courses', 'view-schedule', 'view-form', 'view-success'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (step === 1) {
        const el = document.getElementById('view-courses');
        if (el) el.classList.remove('hidden');
    }
    if (step === 2) {
        const el = document.getElementById('view-schedule');
        if (el) el.classList.remove('hidden');
    }
    if (step === 3) {
        const el = document.getElementById('view-form');
        if (el) el.classList.remove('hidden');

        const dateEl = document.getElementById('confirm-date');
        if (dateEl) dateEl.innerText = selectedDate;

        const timeEl = document.getElementById('confirm-time');
        if (timeEl) timeEl.innerText = selectedTime;

        const courseEl = document.getElementById('confirm-course');
        if (courseEl && selectedCourse) courseEl.innerText = selectedCourse.name;
    }
    renderStepper();
    window.scrollTo(0, 0);
}

function selectCourse(id, name) {
    selectedCourse = { id, name };
    const nameEl = document.getElementById('selected-course-name');
    if (nameEl) nameEl.innerText = name;
    changeStep(2);
}

window.selectTime = function (time) {
    // Check if disabled class exists
    const btn = time === '09:00-12:00' ? document.getElementById('btn-am') : document.getElementById('btn-pm');
    if (!btn || btn.disabled) return;

    selectedTime = time;

    // Visual feedback
    document.querySelectorAll('.slot-btn').forEach(b => {
        b.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-50');
        const statusText = b.querySelector('.status-text');
        if (statusText) statusText.innerText = b.disabled ? "已滿" : "有空";
    });

    btn.classList.add('ring-2', 'ring-blue-600', 'bg-blue-50');
    const statusText = btn.querySelector('.status-text');
    if (statusText) statusText.innerHTML = '<i class="fa-solid fa-check-circle"></i> 已選';

    // Slight delay then next step
    setTimeout(() => changeStep(3), 300);
}

async function checkAvailability(dateStr) {
    const container = document.getElementById('time-slots-container');
    if (container) container.classList.add('opacity-50', 'pointer-events-none');

    const btnAm = document.getElementById('btn-am');
    const btnPm = document.getElementById('btn-pm');

    // Reset
    [btnAm, btnPm].forEach(btn => {
        if (!btn) return;
        btn.disabled = false;
        btn.classList.remove('bg-gray-100', 'cursor-not-allowed', 'opacity-50');
        const statusText = btn.querySelector('.status-text');
        if (statusText) {
            statusText.innerText = "查詢中...";
            statusText.className = "status-text text-sm font-bold text-gray-500";
        }
    });

    try {
        // Query Firestore
        const snapshot = await db.collection('bookings')
            .where('date', '==', dateStr)
            .get();

        const bookedTimes = [];
        snapshot.forEach(doc => bookedTimes.push(doc.data().timeSlot));

        // Update UI
        [btnAm, btnPm].forEach(btn => {
            if (!btn) return;
            // Determine time slot from onclick attribute or ID
            // Safe fallback: btn-am is morning, btn-pm is afternoon
            const isAm = btn.id === 'btn-am';
            const time = isAm ? '09:00-12:00' : '13:30-16:30';

            const statusText = btn.querySelector('.status-text');

            if (bookedTimes.includes(time)) {
                btn.disabled = true;
                btn.classList.add('bg-gray-100', 'cursor-not-allowed', 'opacity-50');
                if (statusText) {
                    statusText.innerText = "已滿";
                    statusText.className = "status-text text-sm font-bold text-gray-400";
                }
            } else {
                if (statusText) {
                    statusText.innerText = "有空 (點選預約)";
                    statusText.className = "status-text text-sm font-bold text-green-600";
                }
            }
        });
    } catch (e) {
        console.error("Error checking availability:", e);
        alert("無法連線至資料庫，請檢查網路狀態");
    } finally {
        if (container) container.classList.remove('opacity-50', 'pointer-events-none');
    }
}

async function submitBooking() {
    const form = document.getElementById('bookingForm');
    if (!form) return;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const data = {
        courseId: selectedCourse ? selectedCourse.id : null,
        courseName: selectedCourse ? selectedCourse.name : null,
        date: selectedDate,
        timeSlot: selectedTime,
        orgName: formData.get('org'),
        contactName: formData.get('name'),
        contactPhone: formData.get('phone'),
        contactEmail: formData.get('email'),
        social: formData.get('social'),
        city: formData.get('city'),
        lecturerFee: formData.get('lecturerFee'), // 新增講師鐘點費
        feeType: formData.get('feeType'),
        notes: formData.get('notes'),
        status: 'pending', // 待確認
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // Double check availability before submitting
        const check = await db.collection('bookings')
            .where('date', '==', selectedDate)
            .where('timeSlot', '==', selectedTime)
            .get();

        if (!check.empty) {
            alert('哎呀！就在剛剛這個時段被搶走了，請重新選擇。');
            changeStep(2);
            return;
        }

        await db.collection('bookings').add(data);

        // Show Success
        const formView = document.getElementById('view-form');
        if (formView) formView.classList.add('hidden');

        const successView = document.getElementById('view-success');
        if (successView) successView.classList.remove('hidden');

        currentStep = 4;
        renderStepper();

        // Send Email via EmailJS
        // Prepare parameters for the email template
        const templateParams = {
            to_email: data.contactEmail,
            to_name: data.contactName,
            course_name: data.courseName,
            date: data.date,
            time_slot: data.timeSlot,
            org_name: data.orgName,
            lecturer_fee: data.lecturerFee // 傳送講師鐘點費
        };

        // Check if emailjs is defined
        if (typeof emailjs !== 'undefined') {
            // TODO: Replace with your actual Service ID and Template ID from EmailJS dashboard
            emailjs.send('service_3majwr9', 'template_iu6mebu', templateParams)
                .then(function (response) {
                    console.log('Email sent successfully!', response.status, response.text);
                }, function (error) {
                    console.error('Email sending failed...', error);
                    // Optional: alert user that email failed but booking succeeded
                });
        }

        console.log("Booking saved!");

    } catch (e) {
        console.error(e);
        alert("送出失敗，請檢查網路連線");
    }
}
