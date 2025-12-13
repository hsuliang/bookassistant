export enum TimeSlot {
  MORNING = '09:00-12:00',
  AFTERNOON = '13:30-16:30'
}

export enum CourseCategory {
  PROJECT = '計畫',
  INVITATION = '邀請',
  COLLABORATION = '合作'
}

export enum BookingStatus {
  PENDING = '待確認',
  CONFIRMED = '已確認',
  COMPLETED = '已完成',
  CANCELLED = '已取消'
}

export interface Course {
  id: string;
  title: string;
  duration: string;
  category: CourseCategory;
  description: string;
  imageUrl: string;
  targetAudience?: string; // 新增：適合族群
}

export interface Booking {
  id: string;
  // Public / Booking Info
  courseId: string;
  courseName: string; // Denormalized for easier display
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  
  // Client Info
  invitingUnit: string; // 邀請單位
  contactName: string; // 聯絡人姓名
  contactPhone: string; // 聯絡電話
  contactSocial: string; // 社群帳號 (現在必填)
  contactEmail?: string; // 新增：聯絡人Email
  city: string; // 邀請縣市
  notes: string; // 備註需求
  
  // 新增費用相關
  hourlyRate?: number; // 新增：鐘點費
  hasTravelFee?: boolean; // 新增：車馬費

  // Admin / Internal Info
  workCategory?: string; // 工作類別 (can be different from course category)
  workContent?: string; // 工作內容
  workBrief?: string; // 工作簡述
  paymentUnit?: string; // 付款單位
  feeCategory?: string; // 費用類別 (e.g. 講師費, 出席費)
  amount?: number; // 金額 (總額，可由鐘點費算或是後台填)
  isReceiptSent?: boolean; // 領據已寄
  isPaymentChecked?: boolean; // 款項已核對
  incomeDate?: string; // 入帳日期
  source?: string; // 邀請來源 (e.g. 網站預約, 熟人介紹)
  createdAt: number;
}