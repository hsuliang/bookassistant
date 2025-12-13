import React, { useState, useEffect } from 'react';
import { Booking, TimeSlot, CourseCategory, Course } from '../types';
import { StorageService } from '../services/storageService';
import { CITIES } from '../constants';
import { 
  Plus, Edit, Trash2, Search, X, Save, 
  DollarSign, FileText, Settings, BookOpen, UploadCloud, Users, Loader2 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'bookings' | 'courses'>('bookings');
  const [loading, setLoading] = useState(false);
  
  // Bookings State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Partial<Booking>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Courses State
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course>>({});

  // Constants for Dropdowns
  const FEE_CATEGORIES = ['鐘點費', '工作費', '輔導費', '出席費', '評審費'];

  // Initial Data Load
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const bookingsData = await StorageService.getAllBookings();
    const coursesData = await StorageService.getAllCourses();
    setBookings(bookingsData);
    setCourses(coursesData);
    setLoading(false);
  };

  // --- Booking Handlers ---
  const handleAddNewBooking = () => {
    setEditingBooking({
      // id will be undefined, so we know it's new
      createdAt: Date.now(),
      date: '',
      timeSlot: TimeSlot.MORNING, // Default
      amount: 0,
      source: '自行新增',
      city: '台北市',
      workCategory: CourseCategory.INVITATION,
      feeCategory: '鐘點費'
    });
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking({ ...booking });
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = async (id: string) => {
    if (confirm('確定要刪除這筆資料嗎？此操作無法復原。')) {
      setLoading(true);
      await StorageService.deleteBooking(id);
      await refreshData();
      setLoading(false);
    }
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (editingBooking.id) {
        // Update
        await StorageService.updateBooking(editingBooking as Booking);
    } else {
        // Add
        await StorageService.addBooking(editingBooking as Booking);
    }
    setIsBookingModalOpen(false);
    await refreshData();
    setLoading(false);
  };

  // --- Course Handlers ---
  const handleAddNewCourse = () => {
    setEditingCourse({
      // id undefined for new
      title: '',
      description: '',
      duration: '3小時',
      targetAudience: '',
      imageUrl: '',
      category: CourseCategory.INVITATION
    });
    setIsCourseModalOpen(true);
  };

  const handleDeleteCourse = async (id: string) => {
    if (confirm('確定要刪除這個課程嗎？刪除後前台將無法預約此課程。')) {
      setLoading(true);
      await StorageService.deleteCourse(id);
      await refreshData();
      setLoading(false);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourse.title) {
        setLoading(true);
        if (editingCourse.id) {
             await StorageService.deleteCourse(editingCourse.id);
             await StorageService.addCourse(editingCourse as Course);
        } else {
            await StorageService.addCourse(editingCourse as Course);
        }

        setIsCourseModalOpen(false);
        await refreshData();
        setLoading(false);
    }
  };

  // Handle Image Upload (Convert to Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) { // Limit to ~800KB to avoid Firestore limits
          alert("圖片大小請小於 800KB");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingCourse(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };


  const filteredBookings = bookings.filter(b => 
    b.invitingUnit?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.date?.includes(searchTerm)
  );

  const LoadingOverlay = () => (
    loading ? (
        <div className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="animate-spin text-white" size={48} />
        </div>
    ) : null
  );

  // Helper to render status badges
  const renderStatus = (booking: Booking) => {
    if (booking.isPaymentChecked) return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">已結案</span>;
    if (booking.incomeDate) return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">已入帳</span>;
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">未入帳</span>;
  };

  // Helper to determine if duration is custom
  const isCustomDuration = (duration?: string) => {
    return duration !== '3小時' && duration !== '6小時' && duration !== '';
  };

  // Helper to determine if timeslot is custom
  const isCustomTimeSlot = (slot?: string) => {
    return slot !== TimeSlot.MORNING && slot !== TimeSlot.AFTERNOON && slot !== '';
  };

  // Helper to check if fee category is custom
  const isCustomFeeCategory = (cat?: string) => {
      return cat && !FEE_CATEGORIES.includes(cat);
  };

  return (
    <div className="relative">
      <LoadingOverlay />
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Settings className="text-indigo-600" /> 
             管理端後台
           </h2>
           <p className="text-slate-500 text-sm mt-1">預約課程管理與設定 (資料庫: Firestore)。</p>
        </div>
        
        {/* Toggle Sections */}
        <div className="bg-slate-200 p-1 rounded-lg flex">
           <button 
             onClick={() => setActiveSection('bookings')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeSection === 'bookings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
             }`}
           >
             課程管理
           </button>
           <button 
             onClick={() => setActiveSection('courses')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeSection === 'courses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
             }`}
           >
             課程項目設定
           </button>
        </div>
      </div>

      {/* --- BOOKINGS (NOW CALLED COURSE MANAGEMENT) SECTION --- */}
      {activeSection === 'bookings' && (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                    type="text" 
                    placeholder="搜尋單位/日期..." 
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleAddNewBooking}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md whitespace-nowrap"
                >
                    <Plus size={18} /> 新增課程邀約
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">日期/時間</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">邀請單位/內容</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">地區/來源</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">費用/狀態</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">管理</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                    {filteredBookings.length === 0 ? (
                        <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            {loading ? '載入中...' : '尚無課程邀約資料'}
                        </td>
                        </tr>
                    ) : filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-900">{booking.date}</div>
                            <div className="text-xs text-slate-500">{booking.timeSlot}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">{booking.invitingUnit || '未填寫'}</div>
                            <div className="text-xs text-slate-500">{booking.courseName || booking.workBrief || booking.workCategory}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{booking.city}</div>
                            <div className="text-xs text-slate-500">{booking.source}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-800">
                            ${booking.amount?.toLocaleString() || 0}
                            </div>
                            <div className="mt-1">{renderStatus(booking)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                            onClick={() => handleEditBooking(booking)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 flex items-center inline-block gap-1"
                            >
                            <Edit size={16} /> 編輯
                            </button>
                            <button 
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="text-red-500 hover:text-red-700 flex items-center inline-block gap-1"
                            >
                            <Trash2 size={16} /> 刪除
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        </>
      )}

      {/* --- COURSES (SERVICE DEFINITIONS) SECTION --- */}
      {activeSection === 'courses' && (
        <>
            <div className="flex justify-end items-center mb-4">
                <button 
                    onClick={handleAddNewCourse}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md whitespace-nowrap"
                >
                    <Plus size={18} /> 新增課程
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length === 0 && !loading && (
                    <div className="col-span-full text-center text-slate-400 py-10">暫無課程，請新增。</div>
                )}
                {courses.map((course) => (
                    <div key={course.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="h-40 bg-slate-200 relative overflow-hidden">
                            {course.imageUrl ? (
                                <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <BookOpen size={48} />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-slate-800 shadow-sm">
                                {course.category}
                            </div>
                        </div>
                        <div className="p-4 flex-grow">
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{course.title}</h3>
                            <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                                <span className="bg-slate-100 px-2 py-0.5 rounded">{course.duration}</span>
                                {course.targetAudience && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded truncate max-w-[150px]">適合: {course.targetAudience}</span>}
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-3">{course.description}</p>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                             <button 
                                onClick={() => handleDeleteCourse(course.id)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                title="刪除"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}

      {/* --- BOOKING MODAL (COURSE INVITATION) --- */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 {editingBooking.id ? '編輯課程邀約' : '新增課程邀約'}
              </h3>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-white hover:bg-indigo-700 rounded-full p-1">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveBooking} className="p-6 space-y-8">
              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <h4 className="text-indigo-600 font-bold border-b pb-2 mb-4">基本資訊</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">日期</label>
                    <input 
                      type="date" required
                      className="mt-1 w-full p-2 border border-slate-300 rounded"
                      value={editingBooking.date || ''}
                      onChange={e => setEditingBooking({...editingBooking, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">時間/時段</label>
                    <div className="flex gap-2">
                        <select 
                            className="mt-1 p-2 border border-slate-300 rounded bg-white min-w-[140px]"
                            value={
                                [TimeSlot.MORNING, TimeSlot.AFTERNOON].includes(editingBooking.timeSlot as TimeSlot) 
                                ? editingBooking.timeSlot 
                                : 'custom'
                            }
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val !== 'custom') {
                                    setEditingBooking({...editingBooking, timeSlot: val as TimeSlot});
                                } else {
                                    setEditingBooking({...editingBooking, timeSlot: '' as any});
                                }
                            }}
                        >
                            <option value={TimeSlot.MORNING}>上午 ({TimeSlot.MORNING})</option>
                            <option value={TimeSlot.AFTERNOON}>下午 ({TimeSlot.AFTERNOON})</option>
                            <option value="custom">自訂</option>
                        </select>
                        {isCustomTimeSlot(editingBooking.timeSlot) && (
                            <input 
                                type="text"
                                className="mt-1 flex-1 p-2 border border-slate-300 rounded"
                                placeholder="自訂時間 (如 18:00-20:00)"
                                value={editingBooking.timeSlot || ''}
                                onChange={e => setEditingBooking({...editingBooking, timeSlot: e.target.value as any})}
                            />
                        )}
                    </div>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700">工作類別</label>
                    <select 
                      className="mt-1 w-full p-2 border border-slate-300 rounded"
                      value={editingBooking.workCategory || CourseCategory.INVITATION}
                      onChange={e => setEditingBooking({...editingBooking, workCategory: e.target.value})}
                    >
                      {Object.values(CourseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="其他">其他</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">邀請單位</label>
                    <input 
                      type="text"
                      className="mt-1 w-full p-2 border border-slate-300 rounded"
                      value={editingBooking.invitingUnit || ''}
                      onChange={e => setEditingBooking({...editingBooking, invitingUnit: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">邀請縣市</label>
                    <select 
                      className="mt-1 w-full p-2 border border-slate-300 rounded"
                      value={editingBooking.city || ''}
                      onChange={e => setEditingBooking({...editingBooking, city: e.target.value})}
                    >
                       <option value="">請選擇</option>
                       {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Work Detail */}
              <div className="space-y-4">
                 <h4 className="text-indigo-600 font-bold border-b pb-2 mb-4">工作內容</h4>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">工作簡述 (對應課程名稱)</label>
                    <div className="flex gap-2">
                        <select 
                            className="mt-1 w-full p-2 border border-slate-300 rounded bg-white"
                            value={
                                courses.some(c => c.title === editingBooking.workBrief) ? editingBooking.workBrief : 'custom'
                            }
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                    // Keep current value if it's already custom, else clear
                                    if (courses.some(c => c.title === editingBooking.workBrief)) {
                                        setEditingBooking({...editingBooking, workBrief: '', courseName: ''});
                                    }
                                } else {
                                    setEditingBooking({...editingBooking, workBrief: val, courseName: val});
                                }
                            }}
                        >
                            <option value="custom">自訂 / 手動輸入</option>
                            <optgroup label="現有課程/服務">
                                {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                            </optgroup>
                        </select>
                    </div>
                    {/* Always show input to allow manual edit even if selected from dropdown, or strictly if custom */}
                    <input 
                      type="text"
                      className="mt-2 w-full p-2 border border-slate-300 rounded bg-slate-50"
                      placeholder="也可直接在此輸入工作標題"
                      value={editingBooking.workBrief || editingBooking.courseName || ''}
                      onChange={e => setEditingBooking({...editingBooking, workBrief: e.target.value, courseName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">詳細工作內容</label>
                    <textarea 
                      className="mt-1 w-full p-2 border border-slate-300 rounded h-20"
                      value={editingBooking.workContent || ''}
                      onChange={e => setEditingBooking({...editingBooking, workContent: e.target.value})}
                    />
                  </div>
              </div>

              {/* Section 3: Finance */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <h4 className="text-indigo-600 font-bold border-b pb-2 mb-4 flex items-center gap-2">
                   <DollarSign size={18} /> 財務與核銷
                 </h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">費用類別</label>
                      <div className="flex gap-2">
                        <select 
                            className="mt-1 p-2 border border-slate-300 rounded bg-white w-full"
                            value={isCustomFeeCategory(editingBooking.feeCategory) ? 'custom' : (editingBooking.feeCategory || '鐘點費')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                    setEditingBooking({...editingBooking, feeCategory: ''});
                                } else {
                                    setEditingBooking({...editingBooking, feeCategory: val});
                                }
                            }}
                        >
                            {FEE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            <option value="custom">自訂</option>
                        </select>
                      </div>
                       {(isCustomFeeCategory(editingBooking.feeCategory) || editingBooking.feeCategory === '') && (
                         <input 
                            type="text"
                            className="mt-2 w-full p-2 border border-slate-300 rounded"
                            placeholder="輸入費用類別"
                            value={editingBooking.feeCategory || ''}
                            onChange={e => setEditingBooking({...editingBooking, feeCategory: e.target.value})}
                         />
                       )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">金額</label>
                      <input 
                        type="number"
                        className="mt-1 w-full p-2 border border-slate-300 rounded"
                        value={editingBooking.amount || 0}
                        onChange={e => setEditingBooking({...editingBooking, amount: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">付款單位</label>
                      <input 
                        type="text"
                        className="mt-1 w-full p-2 border border-slate-300 rounded"
                        value={editingBooking.paymentUnit || ''}
                        onChange={e => setEditingBooking({...editingBooking, paymentUnit: e.target.value})}
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center gap-2 bg-white p-2 rounded border">
                       <input 
                          type="checkbox"
                          id="receipt"
                          className="w-5 h-5 text-indigo-600 rounded"
                          checked={editingBooking.isReceiptSent || false}
                          onChange={e => setEditingBooking({...editingBooking, isReceiptSent: e.target.checked})}
                       />
                       <label htmlFor="receipt" className="text-sm font-medium text-slate-700">領據已寄送/簽收</label>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded border">
                       <input 
                          type="checkbox"
                          id="paymentChecked"
                          className="w-5 h-5 text-indigo-600 rounded"
                          checked={editingBooking.isPaymentChecked || false}
                          onChange={e => setEditingBooking({...editingBooking, isPaymentChecked: e.target.checked})}
                       />
                       <label htmlFor="paymentChecked" className="text-sm font-medium text-slate-700">款項已核對入帳</label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">入帳日期</label>
                      <input 
                        type="date"
                        className="w-full p-1.5 border border-slate-300 rounded text-sm"
                        value={editingBooking.incomeDate || ''}
                        onChange={e => setEditingBooking({...editingBooking, incomeDate: e.target.value})}
                      />
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white p-4 -mx-6 -mb-6">
                <button 
                  type="button" 
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2"
                >
                  <Save size={18} /> 儲存資料
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- COURSE MODAL --- */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <BookOpen size={20} /> 新增服務項目
              </h3>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-white hover:bg-indigo-700 rounded-full p-1">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">課程名稱 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" required
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="例如：校園幽默演講"
                    value={editingCourse.title || ''}
                    onChange={e => setEditingCourse({...editingCourse, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">課程簡介</label>
                  <textarea 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                    placeholder="請輸入課程內容描述..."
                    value={editingCourse.description || ''}
                    onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">時間長度</label>
                    <div className="flex gap-2">
                        <select
                            className="p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[100px]"
                            value={['3小時', '6小時'].includes(editingCourse.duration || '') ? editingCourse.duration : 'custom'}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                    // Switch to custom, preserve value if it was custom, else clear
                                    if (['3小時', '6小時'].includes(editingCourse.duration || '')) {
                                        setEditingCourse({...editingCourse, duration: ''});
                                    }
                                } else {
                                    setEditingCourse({...editingCourse, duration: val});
                                }
                            }}
                        >
                            <option value="3小時">3小時</option>
                            <option value="6小時">6小時</option>
                            <option value="custom">自訂</option>
                        </select>
                        {isCustomDuration(editingCourse.duration) && (
                            <input 
                                type="text"
                                className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="自訂時間"
                                value={editingCourse.duration || ''}
                                onChange={e => setEditingCourse({...editingCourse, duration: e.target.value})}
                            />
                        )}
                    </div>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">課程類別</label>
                     <select 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={editingCourse.category || CourseCategory.INVITATION}
                        onChange={e => setEditingCourse({...editingCourse, category: e.target.value as CourseCategory})}
                     >
                        {Object.values(CourseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">適合族群 <span className="text-slate-400 text-xs">(選填)</span></label>
                   <div className="relative">
                     <Users size={18} className="absolute left-3 top-3.5 text-slate-400" />
                     <input 
                        type="text"
                        className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="例如：高中職學生、企業主管"
                        value={editingCourse.targetAudience || ''}
                        onChange={e => setEditingCourse({...editingCourse, targetAudience: e.target.value})}
                    />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">課程封面 (圖片連結或上傳) <span className="text-slate-400 text-xs">(上傳會轉換為 Base64)</span></label>
                   <div className="flex gap-2 relative group">
                     <div className="relative flex-1">
                        <UploadCloud size={18} className="absolute left-3 top-3.5 text-slate-400" />
                        <input 
                            type="text"
                            className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="圖片網址..."
                            value={editingCourse.imageUrl || ''}
                            onChange={e => setEditingCourse({...editingCourse, imageUrl: e.target.value})}
                        />
                     </div>
                     <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg flex items-center gap-2 border border-indigo-200 transition-colors shrink-0">
                        <UploadCloud size={20} />
                        <span className="font-medium">上傳圖片</span>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                        />
                     </label>
                   </div>
                   <p className="text-xs text-slate-400 mt-1">* 建議圖片大小小於 800KB。</p>
                   {editingCourse.imageUrl && (
                       <div className="mt-2 h-20 w-32 bg-slate-100 rounded border overflow-hidden">
                           <img src={editingCourse.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                       </div>
                   )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button 
                        type="button" 
                        onClick={() => setIsCourseModalOpen(false)}
                        className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                    >
                        取消
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2"
                    >
                        {loading ? '儲存中...' : <><Save size={18} /> 儲存服務項目</>}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};