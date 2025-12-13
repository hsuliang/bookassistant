import { Booking, TimeSlot, Course } from '../types';
import { DEFAULT_COURSES } from '../constants';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from "firebase/firestore";

const BOOKING_COLLECTION = 'bookings';
const COURSE_COLLECTION = 'courses';

// Helper to check if DB is ready
const isDbReady = () => {
    if (!db) {
        alert("資料庫尚未連線！請檢查 services/firebase.ts 設定。");
        return false;
    }
    return true;
};

export const StorageService = {
  // --- Booking Methods ---
  
  getAllBookings: async (): Promise<Booking[]> => {
    if (!isDbReady()) return [];
    try {
        const querySnapshot = await getDocs(collection(db, BOOKING_COLLECTION));
        const bookings: Booking[] = [];
        querySnapshot.forEach((doc) => {
            bookings.push({ id: doc.id, ...doc.data() } as Booking);
        });
        return bookings.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error("Error getting bookings:", error);
        return [];
    }
  },

  addBooking: async (booking: Booking): Promise<void> => {
    if (!isDbReady()) return;
    try {
        // Remove 'id' if it's auto-generated client-side, Firestore creates its own
        // But for compatibility with our type, we keep client ID logic or let Firestore handle it.
        // Let's let Firestore generate ID, then update local object if needed, 
        // OR simpler: use the ID we generated. Firestore allows setting doc ID but addDoc is easier.
        const { id, ...bookingData } = booking; 
        await addDoc(collection(db, BOOKING_COLLECTION), bookingData);
    } catch (error) {
        console.error("Error adding booking:", error);
        alert("預約失敗，請稍後再試");
    }
  },

  updateBooking: async (updatedBooking: Booking): Promise<void> => {
    if (!isDbReady()) return;
    try {
        const bookingRef = doc(db, BOOKING_COLLECTION, updatedBooking.id);
        const { id, ...data } = updatedBooking; // Don't save ID inside the doc data
        await updateDoc(bookingRef, data);
    } catch (error) {
        console.error("Error updating booking:", error);
    }
  },

  deleteBooking: async (id: string): Promise<void> => {
    if (!isDbReady()) return;
    try {
        await deleteDoc(doc(db, BOOKING_COLLECTION, id));
    } catch (error) {
        console.error("Error deleting booking:", error);
    }
  },

  checkAvailability: async (date: string, timeSlot: TimeSlot): Promise<boolean> => {
    if (!isDbReady()) return false;
    try {
        const q = query(
            collection(db, BOOKING_COLLECTION), 
            where("date", "==", date),
            where("timeSlot", "==", timeSlot)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
    } catch (error) {
        console.error("Error checking availability:", error);
        return false;
    }
  },

  // --- Course Methods ---

  getAllCourses: async (): Promise<Course[]> => {
    if (!isDbReady()) return DEFAULT_COURSES;
    try {
        const querySnapshot = await getDocs(collection(db, COURSE_COLLECTION));
        if (querySnapshot.empty) return [];
        
        const courses: Course[] = [];
        querySnapshot.forEach((doc) => {
            courses.push({ id: doc.id, ...doc.data() } as Course);
        });
        return courses;
    } catch (error) {
        console.error("Error getting courses:", error);
        return DEFAULT_COURSES;
    }
  },

  addCourse: async (course: Course): Promise<void> => {
    if (!isDbReady()) return;
    try {
        const { id, ...courseData } = course;
        await addDoc(collection(db, COURSE_COLLECTION), courseData);
    } catch (error) {
        console.error("Error adding course:", error);
    }
  },

  deleteCourse: async (id: string): Promise<void> => {
    if (!isDbReady()) return;
    try {
        await deleteDoc(doc(db, COURSE_COLLECTION, id));
    } catch (error) {
        console.error("Error deleting course:", error);
    }
  },
  
  // Initialization (Seed default courses if empty)
  seedData: async (): Promise<void> => {
    if (!isDbReady()) return;
    
    // Check Courses
    const courses = await StorageService.getAllCourses();
    if (courses.length === 0) {
        console.log("Seeding default courses...");
        for (const course of DEFAULT_COURSES) {
            await StorageService.addCourse(course);
        }
    }
  }
};
