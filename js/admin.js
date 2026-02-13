// --- AUTH ---
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        switchTab('dashboard'); // Default to dashboard
        loadBookings();
        loadAdminCourses();
    } else {
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
    }
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => alert("登入失敗: " + err.message));
});

function logout() { auth.signOut(); }

// --- TABS ---
function switchTab(tab) {
    document.getElementById('tab-dashboard').classList.add('hidden');
    document.getElementById('tab-bookings').classList.add('hidden');
    document.getElementById('tab-courses').classList.add('hidden');
    document.getElementById('tab-reports').classList.add('hidden'); // Hide Reports

    document.getElementById(`tab-${tab}`).classList.remove('hidden');

    if (tab === 'dashboard') loadDashboard();
    if (tab === 'bookings') loadBookings();
    if (tab === 'courses') loadAdminCourses();
    if (tab === 'reports') initReports(); // Init Reports
}

// --- DASHBOARD LOGIC ---
function loadDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Clear time for comparison

    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    db.collection('bookings').orderBy('date', 'asc').onSnapshot(snap => {
        let monthIncome = 0;
        let pendingCount = 0;
        let upcomingCount = 0;
        let unpaidAmount = 0;

        let pendingHtml = '';
        let scheduleHtml = '';

        // For schedule, limit to first 5 upcoming items
        let scheduleItems = [];

        snap.forEach(doc => {
            const data = doc.data();
            const bookingDate = new Date(data.date);
            // Reset time part of bookingDate to ensure accurate date comparison
            bookingDate.setHours(0, 0, 0, 0);

            // Skip cancelled
            if (data.status === 'cancelled') return;

            const fee = (parseInt(data.lecturerFee) || 0) * parseTimeSlotForHours(data.timeSlot);

            // 1. Income (Current Month)
            // Note: getMonth() is 0-indexed.
            if (bookingDate.getMonth() === currentMonth &&
                bookingDate.getFullYear() === currentYear) {
                monthIncome += fee;
            }

            // 2. Pending Count & List construction
            if (data.status === 'pending') {
                pendingCount++;
                pendingHtml += `
                <div class="p-4 flex justify-between items-center hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                    <div>
                        <div class="font-bold text-gray-800">${data.orgName || '未填寫單位'}</div>
                        <div class="text-xs text-gray-500"><i class="fa-regular fa-clock"></i> ${data.date} | ${data.courseName}</div>
                    </div>
                    <button onclick="editBooking('${doc.id}')" class="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full hover:bg-amber-200 shadow-sm transition">
                        <i class="fa-solid fa-pen"></i> 審核
                    </button>
                </div>`;
            }

            // 3. Upcoming (Next 30 Days) & Schedule List
            // Check if date is >= today AND <= 30 days later
            if (bookingDate >= today && bookingDate <= thirtyDaysLater) {
                upcomingCount++;
                scheduleItems.push(data);
            }

            // 4. Unpaid (Confirmed/Completed but not paid)
            // Exclude pending ones from unpaid calculation? Usually yes, until confirmed.
            // Let's assume only 'confirmed' or 'completed' count as 'unpaid' revenue risk.
            if ((data.status === 'confirmed' || data.status === 'completed') && !data.paymentReceived) {
                unpaidAmount += fee;
            }
        });

        // Sort schedule items by date
        scheduleItems.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Generate Schedule HTML (Top 5)
        if (scheduleItems.length > 0) {
            scheduleItems.slice(0, 5).forEach(item => {
                scheduleHtml += `
                <div class="flex gap-4 mb-6 last:mb-0 relative">
                    <div class="flex flex-col items-center">
                        <div class="w-3 h-3 bg-blue-500 rounded-full z-10 ring-4 ring-white"></div>
                        <div class="w-0.5 bg-gray-200 absolute top-3 bottom-[-24px] last:hidden"></div>
                    </div>
                    <div class="-mt-1.5 flex-1">
                        <div class="text-sm font-bold text-gray-800 flex justify-between">
                            <span>${item.date}</span>
                            <span class="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${item.timeSlot}</span>
                        </div>
                        <div class="text-sm text-blue-600 font-medium mt-1">${item.courseName}</div>
                        <div class="text-xs text-gray-400 mt-1 flex items-center">
                            <i class="fa-solid fa-map-pin mr-1"></i> ${item.city || '無地點'} - ${item.orgName || '自辦'}</div>
                    </div>
                </div>`;
            });
        }

        // Update DOM elements
        const incomeEl = document.getElementById('dash-income');
        if (incomeEl) incomeEl.innerText = `$${monthIncome.toLocaleString()}`;

        const pendingEl = document.getElementById('dash-pending');
        if (pendingEl) pendingEl.innerText = pendingCount;

        const upcomingEl = document.getElementById('dash-upcoming');
        if (upcomingEl) upcomingEl.innerText = upcomingCount;

        const unpaidEl = document.getElementById('dash-unpaid');
        if (unpaidEl) unpaidEl.innerText = `$${unpaidAmount.toLocaleString()}`;

        const pendingListEl = document.getElementById('dash-pending-list');
        if (pendingListEl) pendingListEl.innerHTML = pendingHtml || '<div class="p-8 text-center text-gray-400 flex flex-col items-center"><i class="fa-solid fa-clipboard-check text-4xl mb-2 text-gray-200"></i><p>目前沒有待確認的邀約</p></div>';

        const scheduleListEl = document.getElementById('dash-schedule-list');
        if (scheduleListEl) scheduleListEl.innerHTML = scheduleHtml || '<div class="p-8 text-center text-gray-400 flex flex-col items-center"><i class="fa-regular fa-calendar-xmark text-4xl mb-2 text-gray-200"></i><p>近期沒有行程</p></div>';
    });
}

// --- DASHBOARD DETAIL MODAL LOGIC ---
function showDashboardDetail(type) {
    const modal = document.getElementById('detail-modal');
    const titleEl = document.getElementById('detail-modal-title');
    const contentEl = document.getElementById('detail-modal-content');
    const headerEl = document.getElementById('detail-modal-header');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    contentEl.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-gray-400"></i></div>';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    let filtered = [];
    let html = '';
    let title = '';
    let headerClass = 'bg-gray-800'; // Default

    // 1. Prepare Data
    if (type === 'income') {
        title = '本月收入明細 (預估)';
        headerClass = 'bg-gradient-to-r from-emerald-600 to-teal-700';
        filtered = bookingsData.filter(d => {
            const dDate = new Date(d.date);
            dDate.setHours(0, 0, 0, 0);
            return d.status !== 'cancelled' &&
                dDate.getMonth() === currentMonth &&
                dDate.getFullYear() === currentYear;
        });
        // Sort by date desc
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    else if (type === 'pending') {
        title = '待確認邀約清單';
        headerClass = 'bg-gradient-to-r from-amber-500 to-orange-600';
        filtered = bookingsData.filter(d => d.status === 'pending');
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first
    }
    else if (type === 'upcoming') {
        title = '未來行程總覽';
        headerClass = 'bg-gradient-to-r from-blue-600 to-indigo-700';
        filtered = bookingsData.filter(d => {
            const dDate = new Date(d.date);
            dDate.setHours(0, 0, 0, 0);
            return d.status !== 'cancelled' && dDate >= today;
        });
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); // Nearest first
    }
    else if (type === 'unpaid') {
        title = '未入帳款項追蹤';
        headerClass = 'bg-gradient-to-r from-rose-600 to-pink-700';
        filtered = bookingsData.filter(d => {
            return (d.status === 'confirmed' || d.status === 'completed') && !d.paymentReceived;
        });
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest unpaid first
    }

    // Update Header Style
    headerEl.className = `p-5 text-white rounded-t-xl flex justify-between items-center shrink-0 ${headerClass}`;
    titleEl.innerHTML = `<i class="fa-solid fa-list-ul mr-2"></i> ${title}`;

    // 2. Generate HTML
    if (filtered.length === 0) {
        contentEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                <i class="fa-regular fa-folder-open text-5xl mb-4 opacity-50"></i>
                <p class="text-lg">目前沒有相關資料</p>
            </div>`;
        return;
    }

    // Summary (if applicable)
    if (type === 'income' || type === 'unpaid') {
        let total = 0;
        filtered.forEach(d => {
            total += (parseInt(d.lecturerFee) || 0) * parseTimeSlotForHours(d.timeSlot);
        });
        html += `
        <div class="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
            <div class="flex items-center">
                <div class="bg-emerald-100 text-emerald-600 p-2 rounded mr-3">
                    <i class="fa-solid fa-money-bill-wave"></i>
                </div>
                <span class="text-gray-600 font-bold text-lg">總金額合計：</span>
            </div>
            <span class="text-3xl font-bold text-gray-800">$${total.toLocaleString()}</span>
        </div>`;
    }

    html += `<div class="overflow-x-auto"><table class="w-full text-left border-collapse">`;

    // Table Header
    html += `
        <thead class="bg-gray-50 border-b text-gray-500 text-sm uppercase">
            <tr>
                <th class="p-4">日期/時間</th>
                <th class="p-4">單位/課程</th>
                ${type !== 'schedule' ? '<th class="p-4">費用/狀態</th>' : ''}
                <th class="p-4 text-right">操作</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
    `;

    filtered.forEach(d => {
        const fee = (parseInt(d.lecturerFee) || 0) * parseTimeSlotForHours(d.timeSlot);
        let actionBtn = `<button onclick="editBooking('${d.id}'); document.getElementById('detail-modal').classList.add('hidden')" class="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition">查看詳情</button>`;

        // Specific Actions
        if (type === 'unpaid') {
            actionBtn = `
            <button onclick="quickTogglePayment('${d.id}', true)" class="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded text-sm font-bold transition flex items-center ml-auto">
                <i class="fa-solid fa-check mr-1"></i> 註記已收款
            </button>`;
        }

        let statusBadge = '';
        switch (d.status) {
            case 'pending': statusBadge = '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">待確認</span>'; break;
            case 'confirmed': statusBadge = '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">已確認</span>'; break;
            case 'completed': statusBadge = '<span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">已完成</span>'; break;
            default: statusBadge = '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">' + d.status + '</span>';
        }

        html += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-4">
                    <div class="font-bold text-gray-800">${d.date}</div>
                    <div class="text-xs text-gray-500">${d.timeSlot}</div>
                </td>
                <td class="p-4">
                    <div class="font-bold text-gray-800">${d.orgName || '自辦'}</div>
                    <div class="text-sm text-blue-600">${d.courseName}</div>
                    <div class="text-xs text-gray-400 mt-1"><i class="fa-solid fa-user"></i> ${d.contactName || '-'} | <i class="fa-solid fa-map-marker-alt"></i> ${d.city || '-'}</div>
                </td>
                 ${type !== 'schedule' ? `
                <td class="p-4">
                    <div class="font-bold text-gray-800">$${fee.toLocaleString()}</div>
                    <div class="mt-1">${statusBadge}</div>
                </td>` : ''}
                <td class="p-4 text-right">
                    ${actionBtn}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    contentEl.innerHTML = html;
}

async function quickTogglePayment(id, status) {
    if (!confirm("確定將此筆款項標記為「已入帳」嗎？")) return;
    try {
        await db.collection('bookings').doc(id).update({ paymentReceived: status });
        // Refresh modal content (find current type? simpler to just close or reload same type)
        // For simplicity, we just reload the dashboard logic which updates 'bookingsData' via listener,
        // but we might need to manually trigger a re-render of this modal if it's open.
        // Since 'bookingsData' updates in real-time, we can just re-call showDashboardDetail if we knew the type.
        // Let's just close it and let the user see the updated stats.
        document.getElementById('detail-modal').classList.add('hidden');
        document.getElementById('detail-modal').classList.remove('flex');
    } catch (e) {
        alert("更新失敗");
    }
}

// --- BOOKING LOGIC ---
let bookingsData = [];
let currentSort = 'date-desc';
let currentSearch = '';

function loadBookings() {
    // Listen to real-time updates
    db.collection('bookings').orderBy('date', 'desc').onSnapshot(snap => {
        bookingsData = [];
        snap.forEach(doc => {
            bookingsData.push({ id: doc.id, ...doc.data() });
        });
        populateBookingFilters();
        renderBookings();
    });
}

function populateBookingFilters() {
    const months = new Set();
    const orgs = new Set();
    const courses = new Set();

    bookingsData.forEach(d => {
        if (d.date) months.add(d.date.substring(0, 7)); // YYYY-MM
        if (d.orgName) orgs.add(d.orgName);
        if (d.courseName) courses.add(d.courseName);
    });

    // Helper to fill select
    const fill = (id, set, label) => {
        const sel = document.getElementById(id);
        const currentVal = sel.value;
        sel.innerHTML = `<option value="">${label}</option>`;
        Array.from(set).sort().reverse().forEach(val => { // Sort desc for months/dates
            const opt = document.createElement('option');
            opt.value = val;
            opt.innerText = val;
            if (val === currentVal) opt.selected = true;
            sel.appendChild(opt);
        });
    };

    fill('filter-month', months, '全部月份');
    fill('filter-org', orgs, '全部單位');
    fill('filter-course', courses, '全部課程');
}

function renderBookings() {
    const tbody = document.getElementById('booking-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const fMonth = document.getElementById('filter-month').value;
    const fOrg = document.getElementById('filter-org').value;
    const fCourse = document.getElementById('filter-course').value;

    // 1. Filter
    let filtered = bookingsData.filter(item => {
        // Dropdown Filters
        if (fMonth && (!item.date || !item.date.startsWith(fMonth))) return false;
        if (fOrg && item.orgName !== fOrg) return false;
        if (fCourse && item.courseName !== fCourse) return false;

        // Text Search
        if (!currentSearch) return true;
        const s = currentSearch.toLowerCase();
        return (item.orgName && item.orgName.toLowerCase().includes(s)) ||
            (item.date && item.date.includes(s)) ||
            (item.courseName && item.courseName.toLowerCase().includes(s)) ||
            (item.contactName && item.contactName.toLowerCase().includes(s));
    });

    // 2. Sort
    filtered.sort((a, b) => {
        if (currentSort === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (currentSort === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (currentSort === 'status') {
            const priority = { 'pending': 1, 'confirmed': 2, 'completed': 3, 'cancelled': 4 };
            const pA = priority[a.status] || 99;
            const pB = priority[b.status] || 99;
            // If filtering by status, secondary sort by date (desc)
            if (pA !== pB) return pA - pB;
            return new Date(b.date) - new Date(a.date);
        }
        return 0;
    });

    // 3. Render
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">沒有符合的資料</td></tr>';
        return;
    }

    filtered.forEach(data => {
        const statusClass = data.paymentReceived ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        const statusText = data.paymentReceived ? '已入帳' : '未入帳';

        // Status Badge
        let statusBadge = '';
        switch (data.status) {
            case 'pending': statusBadge = '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">待確認</span>'; break;
            case 'confirmed': statusBadge = '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">已確認</span>'; break;
            case 'completed': statusBadge = '<span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">已完成</span>'; break;
            case 'cancelled': statusBadge = '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">已取消</span>'; break;
            default: statusBadge = '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">未知</span>';
        }

        const feePerHr = data.lecturerFee || 0;
        const calculatedHours = parseTimeSlotForHours(data.timeSlot);
        const totalFee = feePerHr * calculatedHours;

        const row = `
        <tr class="hover:bg-gray-50 border-b">
            <td class="p-4">
                <div class="font-bold">${data.date}</div>
                <div class="text-sm text-gray-500">${data.timeSlot}</div>
                <div class="mt-1">${statusBadge}</div>
            </td>
            <td class="p-4">
                <div class="font-bold">${data.orgName || '自辦'}</div>
                <div class="text-sm text-gray-500"><i class="fa-solid fa-user"></i> ${data.contactName || '-'}</div>
            </td>
            <td class="p-4 text-sm">
                <div class="text-blue-600 font-medium">${data.courseName}</div>
                <div class="text-gray-500"><i class="fa-solid fa-map-marker-alt"></i> ${data.city || '-'}</div>
            </td>
            <td class="p-4">
                <div class="font-bold">$${isNaN(totalFee) ? 0 : totalFee}</div>
                <span class="text-xs px-2 py-1 rounded-full ${statusClass} mt-1 inline-block">${statusText}</span>
            </td>
            <td class="p-4 text-right space-x-2">
                <button onclick="editBooking('${data.id}')" class="text-blue-600 hover:underline"><i class="fa-solid fa-edit"></i> 編輯</button>
                <button onclick="deleteDoc('bookings','${data.id}')" class="text-red-600 hover:underline"><i class="fa-solid fa-trash"></i> 刪除</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

async function openBookingModal() {
    const form = document.getElementById('adminBookingForm');
    form.reset();

    // 強制清空隱藏的 ID 欄位，確保「新增」不會變成「覆蓋」
    if (form.docId) form.docId.value = '';

    // 顯示重複設定區塊 (僅限新增)
    document.getElementById('recurrence-section').classList.remove('hidden');
    document.getElementById('recurringEndDateContainer').classList.add('hidden');

    await loadCoursesForSelect(); // 等待課程選單載入完成
    toggleCustomWorkType(); // Reset custom input visibility
    document.getElementById('booking-modal').classList.remove('hidden');
    document.getElementById('booking-modal').classList.add('flex');
}

function toggleRecurringDate() {
    const type = document.getElementById('recurringType').value;
    const container = document.getElementById('recurringEndDateContainer');
    if (type !== 'none') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function closeBookingModal() {
    document.getElementById('booking-modal').classList.add('hidden');
    document.getElementById('booking-modal').classList.remove('flex');
}

function toggleCustomWorkType() {
    const select = document.getElementById('workTypeSelect');
    const customInput = document.getElementById('customWorkType');
    if (select.value === '自訂') {
        customInput.classList.remove('hidden');
        customInput.required = true;
    } else {
        customInput.classList.add('hidden');
        customInput.required = false;
    }
}

async function loadCoursesForSelect() {
    const select = document.getElementById('courseNameSelect');
    // Keep the default option
    select.innerHTML = '<option value="">請選擇課程...</option>';

    // Add Hardcoded Options (Non-course work)
    const specialOptions = ['年度合約/顧問服務', '居久屋微醺夜', 'T++教育+年華'];
    specialOptions.forEach(optText => {
        const option = document.createElement('option');
        option.value = optText;
        option.textContent = `★ ${optText}`;
        option.classList.add('font-bold', 'text-blue-600');
        select.appendChild(option);
    });

    try {
        const snap = await db.collection('courses').get();
        snap.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data.title;
            option.textContent = data.title;
            select.appendChild(option);
        });
    } catch (e) {
        console.error("Error loading courses:", e);
    }
}

async function saveBooking() {
    const form = document.getElementById('adminBookingForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Handle Work Type
    if (data.type === '自訂') {
        const customType = document.getElementById('customWorkType').value;
        if (customType) {
            data.type = customType;
        }
    }

    // Convert checkboxes
    data.receiptSent = form.querySelector('[name=receiptSent]').checked;
    data.paymentReceived = form.querySelector('[name=paymentReceived]').checked;

    // Check ID
    const docId = data.docId;
    delete data.docId; // Don't save ID inside data

    try {
        if (docId) {
            // 1. 單筆更新模式
            await db.collection('bookings').doc(docId).update(data);
        } else {
            // 2. 新增模式 (包含可能的批次建立)
            const recurringType = data.recurringType;
            const startDateStr = data.date;
            const endDateStr = data.recurringEndDate;

            // 移除不需要存入資料庫的重複設定欄位
            delete data.recurringType;
            delete data.recurringEndDate;

            if (recurringType === 'none' || !endDateStr) {
                // 單筆新增
                await db.collection('bookings').add(data);
            } else {
                // 批次建立
                let currentDate = new Date(startDateStr);
                const endDate = new Date(endDateStr);

                // 檢查起始日是否為月底 (例如 1/31)
                const startDay = currentDate.getDate();
                const daysInStartMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                const isLastDay = startDay === daysInStartMonth;

                // 防止無限迴圈的安全機制 (最多一年)
                const maxDate = new Date(currentDate);
                maxDate.setFullYear(maxDate.getFullYear() + 1);

                const batchData = [];

                while (currentDate <= endDate && currentDate <= maxDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    batchData.push({
                        ...data,
                        date: dateStr
                    });

                    // 計算下一個日期
                    if (recurringType === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                    else if (recurringType === 'biweekly') currentDate.setDate(currentDate.getDate() + 14);
                    else if (recurringType === 'monthly') {
                        // 月底邏輯修正
                        if (isLastDay) {
                            // 如果是月底，下個月也要鎖定在月底
                            // 先加一個月，設為該月1號
                            currentDate.setMonth(currentDate.getMonth() + 1, 1);
                            // 再設為該月最後一天 (下個月的第0天)
                            currentDate.setDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
                        } else {
                            // 普通日期直接加月
                            currentDate.setMonth(currentDate.getMonth() + 1);
                        }
                    }
                    else break;
                }

                if (batchData.length > 20 && !confirm(`系統即將批次建立 ${batchData.length} 筆資料，確定嗎？`)) {
                    return;
                }

                // Firestore 無批次 add 的簡單寫法 (Promise.all)
                const promises = batchData.map(item => db.collection('bookings').add(item));
                await Promise.all(promises);
                alert(`成功批次建立 ${batchData.length} 筆工作行程！`);
            }
        }
        closeBookingModal();
        loadDashboard(); // Ensure dashboard is refreshed
    } catch (e) { alert("儲存失敗"); console.error(e); }
}

// --- COURSE LOGIC ---
function loadAdminCourses() {
    db.collection('courses').onSnapshot(snap => {
        const tbody = document.getElementById('course-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const row = `
            <tr class="hover:bg-gray-50">
                <td class="p-4 align-top">
                    <div class="flex items-center space-x-3">
                        ${data.image ? `<img src="${data.image}" class="w-10 h-10 rounded object-cover border">` : '<div class="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-400"><i class="fa-solid fa-image"></i></div>'}
                        <div class="font-bold text-gray-800">${data.title}</div>
                    </div>
                </td>
                <td class="p-4 text-sm text-gray-600 align-top line-clamp-2">${data.description}</td>
                <td class="p-4 text-sm text-gray-600 align-top">${data.duration}</td>
                <td class="p-4 text-sm align-top">
                    <span class="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">${data.category}</span>
                    ${data.tags && Array.isArray(data.tags) ? data.tags.map(tag => `<span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs ml-1">${tag}</span>`).join('') : ''}
                </td>
                <td class="p-4 text-right space-x-2 align-top">
                        <button onclick="editCourse('${doc.id}')" class="text-blue-600 hover:text-blue-800 text-sm"><i class="fa-solid fa-edit"></i> 編輯</button>
                        <button onclick="deleteDoc('courses', '${doc.id}')" class="text-red-500 hover:text-red-700 text-sm"><i class="fa-solid fa-trash"></i> 刪除</button>
                </td>
            </tr>`;
            tbody.innerHTML += row;
        });
    });
}

function openCourseModal(id = null) {
    const form = document.getElementById('courseForm');
    form.reset();

    // 強制清空課程 ID，避免新增變成覆蓋
    if (form.courseId) form.courseId.value = '';

    // Reset complex fields
    document.getElementById('courseImageUrl').value = '';
    document.getElementById('imagePreview').classList.add('hidden');

    toggleCustomDuration();
    toggleCustomCategory();

    document.getElementById('course-modal').classList.remove('hidden');
    document.getElementById('course-modal').classList.add('flex');
}

function toggleCustomDuration() {
    const select = document.getElementById('durationSelect');
    const customInput = document.getElementById('customDuration');
    if (select.value === '自訂') {
        customInput.classList.remove('hidden');
        customInput.required = true;
    } else {
        customInput.classList.add('hidden');
        customInput.required = false;
    }
}

function toggleCustomCategory() {
    const select = document.getElementById('categorySelect');
    const customInput = document.getElementById('customCategory');
    if (select.value === '自訂') {
        customInput.classList.remove('hidden');
        customInput.required = true;
    } else {
        customInput.classList.add('hidden');
        customInput.required = false;
    }
}

function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const targetAspectRatio = 16 / 9;
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = img.width;
            let sourceHeight = img.height;

            const originalAspectRatio = img.width / img.height;

            if (originalAspectRatio > targetAspectRatio) {
                // Original is wider, crop width
                sourceWidth = img.height * targetAspectRatio;
                sourceX = (img.width - sourceWidth) / 2;
            } else if (originalAspectRatio < targetAspectRatio) {
                // Original is taller, crop height
                sourceHeight = img.width / targetAspectRatio;
                sourceY = (img.height - sourceHeight) / 2;
            }

            // Max dimensions for the final 16:9 image
            const MAX_FINAL_WIDTH = 800;
            const MAX_FINAL_HEIGHT = 450; // 800 / 16 * 9

            canvas.width = MAX_FINAL_WIDTH;
            canvas.height = MAX_FINAL_HEIGHT;
            // Draw the cropped portion of the image onto the canvas, resized to fill the canvas
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, MAX_FINAL_WIDTH, MAX_FINAL_HEIGHT);

            // Compress to JPEG 0.7
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

            document.getElementById('imagePreview').classList.remove('hidden');
            document.getElementById('imagePreview').querySelector('img').src = dataUrl;
            document.getElementById('courseImageUrl').value = dataUrl; // Store optimized Base64
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    document.getElementById('courseImageFile').value = '';
    document.getElementById('courseImageUrl').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
}

async function saveCourse() {
    const form = document.getElementById('courseForm');

    // Handle Duration
    let duration = form.durationSelect.value;
    if (duration === '自訂') {
        duration = form.customDuration.value;
    }

    // Handle Category
    let category = form.categorySelect.value;
    if (category === '自訂') {
        category = form.customCategory.value;
    }

    // Handle Tags
    const tagsStr = form.tags.value;
    const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(t => t) : [];

    const data = {
        title: form.title.value,
        description: form.description.value,
        duration: duration,
        category: category,
        tags: tags,
        image: form.imageUrl.value,
        requirements: form.requirements.value
    };

    const docId = form.courseId.value;

    try {
        if (docId) {
            await db.collection('courses').doc(docId).update(data);
        } else {
            await db.collection('courses').add(data);
        }
        document.getElementById('course-modal').classList.add('hidden');
    } catch (e) {
        console.error("Error saving course:", e);
        alert("儲存失敗");
    }
}

window.editCourse = async function (id) {
    const doc = await db.collection('courses').doc(id).get();
    const data = doc.data();
    const form = document.getElementById('courseForm');

    openCourseModal();
    form.courseId.value = id;
    form.title.value = data.title;
    form.description.value = data.description;
    form.requirements.value = data.requirements || '';

    // Handle Duration Edit Logic
    const standardDurations = ['3小時', '6小時'];
    if (standardDurations.includes(data.duration)) {
        form.durationSelect.value = data.duration;
    } else {
        form.durationSelect.value = '自訂';
        form.customDuration.value = data.duration;
    }
    toggleCustomDuration();

    // Handle Category Edit Logic
    const standardCategories = ['初階', '進階'];
    if (standardCategories.includes(data.category)) {
        form.categorySelect.value = data.category;
    } else {
        form.categorySelect.value = '自訂';
        form.customCategory.value = data.category;
    }
    toggleCustomCategory();

    // Handle Tags
    if (data.tags && Array.isArray(data.tags)) {
        form.tags.value = data.tags.join(', ');
    } else {
        form.tags.value = '';
    }

    // Handle Image
    if (data.image) {
        form.imageUrl.value = data.image;
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('imagePreview').querySelector('img').src = data.image;
    }
}

// --- REPORTS LOGIC ---
let revenueChartInstance = null;
let categoryChartInstance = null;
let cityChartInstance = null;

function initReports() {
    // Populate Year Select
    const yearSelect = document.getElementById('report-year');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y + ' 年';
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // Init Custom Date Inputs (Default to This Month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('report-start').value = firstDay;
    document.getElementById('report-end').value = lastDay;

    loadReports();
}

function toggleReportMode() {
    const mode = document.getElementById('report-mode').value;
    if (mode === 'year') {
        document.getElementById('report-mode-year').classList.remove('hidden');
        document.getElementById('report-mode-custom').classList.add('hidden');
    } else {
        document.getElementById('report-mode-year').classList.add('hidden');
        document.getElementById('report-mode-custom').classList.remove('hidden');
        document.getElementById('report-mode-custom').classList.add('flex');
    }
    loadReports(); // Reload data based on new mode
}

function loadReports() {
    const mode = document.getElementById('report-mode').value;
    let reportData = [];

    if (mode === 'year') {
        const selectedYear = parseInt(document.getElementById('report-year').value);
        reportData = bookingsData.filter(d => {
            const date = new Date(d.date);
            return d.status !== 'cancelled' && date.getFullYear() === selectedYear;
        });
    } else {
        const startStr = document.getElementById('report-start').value;
        const endStr = document.getElementById('report-end').value;
        if (!startStr || !endStr) return; // Wait for inputs

        const start = new Date(startStr);
        const end = new Date(endStr);

        reportData = bookingsData.filter(d => {
            const date = new Date(d.date);
            return d.status !== 'cancelled' && date >= start && date <= end;
        });
    }

    // 1. Aggregation
    const monthlyRevenue = new Array(12).fill(0);
    const categoryStats = {};
    const cityStats = {};

    let totalRevenue = 0;
    let totalCount = reportData.length;

    reportData.forEach(d => {
        const date = new Date(d.date);
        const month = date.getMonth(); // 0-11
        const fee = (parseInt(d.lecturerFee) || 0) * parseTimeSlotForHours(d.timeSlot);

        // Only count revenue for confirmed/completed (or maybe pending too as "forecast")
        // Let's count all non-cancelled for "Forecast" report
        monthlyRevenue[month] += fee;
        totalRevenue += fee;

        // Category
        const cat = d.courseName || '未分類';
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;

        // City
        const city = d.city || '未填寫';
        cityStats[city] = (cityStats[city] || 0) + 1;
    });

    // 2. Update Summary Cards
    document.getElementById('report-total-revenue').innerText = '$' + totalRevenue.toLocaleString();
    document.getElementById('report-total-count').innerText = totalCount;
    const avg = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
    document.getElementById('report-avg-revenue').innerText = '$' + avg.toLocaleString();

    // 3. Render Charts
    renderRevenueChart(monthlyRevenue);
    renderCategoryChart(categoryStats);
    renderCityChart(cityStats);
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            datasets: [{
                label: '月營收 (NT$)',
                data: data,
                backgroundColor: 'rgba(79, 70, 229, 0.6)', // Indigo-600
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderCategoryChart(stats) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();

    // Sort and take Top 5
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    let labels = [];
    let data = [];

    if (sorted.length > 6) {
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5).reduce((acc, curr) => acc + curr[1], 0);
        labels = top5.map(i => i[0]);
        data = top5.map(i => i[1]);
        labels.push('其他');
        data.push(others);
    } else {
        labels = sorted.map(i => i[0]);
        data = sorted.map(i => i[1]);
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#6B7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function renderCityChart(stats) {
    const ctx = document.getElementById('cityChart').getContext('2d');
    if (cityChartInstance) cityChartInstance.destroy();

    // Sort Top 10
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 10);

    cityChartInstance = new Chart(ctx, {
        type: 'bar',
        indexAxis: 'y', // Horizontal
        data: {
            labels: sorted.map(i => i[0]),
            datasets: [{
                label: '場次',
                data: sorted.map(i => i[1]),
                backgroundColor: 'rgba(20, 184, 166, 0.6)', // Teal-500
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function exportToCSV() {
    const mode = document.getElementById('report-mode').value;
    let dataToExport = [];
    let fileName = '報表.csv';

    if (mode === 'year') {
        const selectedYear = document.getElementById('report-year').value;
        fileName = `課程營運報表_${selectedYear}.csv`;
        dataToExport = bookingsData.filter(d => {
            const date = new Date(d.date);
            return d.status !== 'cancelled' && date.getFullYear() == selectedYear;
        });
    } else {
        const startStr = document.getElementById('report-start').value;
        const endStr = document.getElementById('report-end').value;
        fileName = `課程營運報表_${startStr}_${endStr}.csv`;
        const start = new Date(startStr);
        const end = new Date(endStr);
        dataToExport = bookingsData.filter(d => {
            const date = new Date(d.date);
            return d.status !== 'cancelled' && date >= start && date <= end;
        });
    }

    if (dataToExport.length === 0) {
        alert("該區間無資料可匯出");
        return;
    }

    // Define Headers
    const headers = ['日期', '時段', '課程名稱', '邀請單位', '聯絡人', '縣市', '講師費/hr', '預估總額', '狀態', '款項入帳'];

    // CSV Content with BOM for Excel Chinese support
    let csvContent = "\uFEFF" + headers.join(",") + "\n";

    dataToExport.forEach(d => {
        const fee = d.lecturerFee || 0;
        const total = fee * parseTimeSlotForHours(d.timeSlot);
        const row = [
            d.date,
            d.timeSlot,
            `"${d.courseName}"`, // Quote strings with potential commas
            `"${d.orgName}"`,
            d.contactName,
            d.city,
            fee,
            total,
            d.status,
            d.paymentReceived ? '是' : '否'
        ];
        csvContent += row.join(",") + "\n";
    });

    // Trigger Download
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- UTILS ---
async function deleteDoc(col, id) {
    if (confirm("確定要刪除嗎？")) {
        await db.collection(col).doc(id).delete();
        if (col === 'bookings') loadDashboard(); // Update stats
    }
}

// Helper to edit booking (Filling the form)
window.editBooking = async function (id) {
    const doc = await db.collection('bookings').doc(id).get();
    const data = doc.data();
    const form = document.getElementById('adminBookingForm');

    await openBookingModal();

    // 編輯模式下隱藏重複設定區塊
    document.getElementById('recurrence-section').classList.add('hidden');

    // Must wait for courses to load before setting value, or set value after loading
    await loadCoursesForSelect();

    form.docId.value = id;
    form.date.value = data.date;
    form.timeSlot.value = data.timeSlot;
    form.courseName.value = data.courseName;
    form.orgName.value = data.orgName || '';
    form.city.value = data.city || '';
    // Use new field names
    form.contactName.value = data.contactName || data.inviter || ''; // Fallback for old data
    form.contactPhone.value = data.contactPhone || '';
    form.contactEmail.value = data.contactEmail || '';
    form.lecturerFee.value = data.lecturerFee || data.fee || 0; // Fallback
    form.notes.value = data.notes || '';

    // Payer defaults to orgName if empty
    form.payerName.value = data.payerName || data.orgName || '';

    // Handle Work Type Logic for Edit
    const workTypeSelect = document.getElementById('workTypeSelect');
    const customWorkTypeInput = document.getElementById('customWorkType');

    // Check if the saved type is one of the standard options
    const standardTypes = ['邀請', '自辦', '合作'];
    if (!data.type || standardTypes.includes(data.type)) {
        workTypeSelect.value = data.type || '邀請';
        customWorkTypeInput.classList.add('hidden');
    } else {
        customWorkTypeInput.value = data.type;
        customWorkTypeInput.classList.remove('hidden');
    }

    // Status field
    form.status.value = data.status || 'pending';

    // checkboxes
    form.receiptSent.checked = data.receiptSent || false;
    form.paymentReceived.checked = data.paymentReceived || false;
}

function parseTimeSlotForHours(timeSlotString) {
    if (timeSlotString === "全天/不指定") return 1;
    if (timeSlotString === "09:00-12:00" || timeSlotString === "13:30-16:30") {
        return 3;
    }
    return 0; // Default or error case for unknown time slots
}
