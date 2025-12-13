import { Course, CourseCategory } from './types';

export const APP_NAME = "丫亮笑長的上課助手";
export const ADMIN_PASSWORD = "admin"; // Simple password for demo

export const CITIES = [
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
  "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
  "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "臺東縣", "澎湖縣", "金門縣", "連江縣", "海外", "線上"
];

// 預設課程資料 (當 localStorage 沒有資料時使用)
export const DEFAULT_COURSES: Course[] = [
  {
    id: 'c1',
    title: '校園巡迴演講',
    category: CourseCategory.INVITATION,
    duration: '3小時',
    description: '適合高中職、大學週會，主題包含職涯探索、幽默溝通。',
    targetAudience: '高中職、大專院校學生',
    imageUrl: 'https://picsum.photos/400/200?random=1'
  },
  {
    id: 'c2',
    title: '企業激勵大會',
    category: CourseCategory.INVITATION,
    duration: '6小時',
    description: '針對業務團隊、員工激勵，結合脫口秀與實戰心法。',
    targetAudience: '企業業務團隊、新進員工',
    imageUrl: 'https://picsum.photos/400/200?random=2'
  },
  {
    id: 'c3',
    title: '長期合作專案',
    category: CourseCategory.PROJECT,
    duration: '自訂',
    description: '針對特定機構進行長期輔導與課程規劃。',
    targetAudience: '機構、教育單位',
    imageUrl: 'https://picsum.photos/400/200?random=3'
  },
  {
    id: 'c4',
    title: '跨界合作演出',
    category: CourseCategory.COLLABORATION,
    duration: '3小時',
    description: '與不同領域表演者合作，創造全新舞台體驗。',
    targetAudience: '一般大眾',
    imageUrl: 'https://picsum.photos/400/200?random=4'
  }
];