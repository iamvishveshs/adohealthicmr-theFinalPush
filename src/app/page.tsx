"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  getModules, createModule, updateModule, deleteModule,
  getQuestions, createQuestion, updateQuestion, deleteQuestion,
  getAnswers, submitAnswer,
  getVideos, createVideo, deleteVideo,
  type ModuleData, type QuestionData, type AnswerData, type VideoData
} from "./utils/api";
import Header from "../components/Header";
import HeroTitleSection from "../components/HeroTitleSection";
import MainHero from "../components/MainHero";
import ImageSection from "../components/ImageSection";
import StatisticsSection from "../components/StatisticsSection";
import RiskFactorsSection from "../components/RiskFactorsSection";
import Footer from "../components/Footer";
import UploadProgressBar from "../components/UploadProgressBar";
import VideoPlayer from "../components/VideoPlayer";
import { UploadProgress } from "../lib/cloudinary-direct-upload";
import { storeVideo, uploadVideoInBackground, processPendingUploads, getPendingUploads, type StoredVideo } from "../lib/video-storage";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer?: number; // Index of the correct answer (0-based)
}

// Default questions for new modules
const defaultQuestions: Question[] = [
  {
    id: 1,
    question: "Which of the following is a Non-communicable Disease (NCD)?",
    options: ["A. Tuberculosis", "B. Heart disease", "C. Cholera", "D. Hepatitis"],
    correctAnswer: 1, // B. Heart disease
  },
  {
    id: 2,
    question: "Which of the following is one of the BIG 7 risk factors that causes NCDs?",
    options: ["A. Drinking water", "B. Unhealthy diet", "C. Brushing teeth", "D. Washing hands"],
    correctAnswer: 1, // B. Unhealthy diet
  },
  {
    id: 3,
    question: 'What does the "S" in BE FAST for stroke stand for?',
    options: ["A. Sleep", "B. Speech difficulty", "C. Stress", "D. Sugar"],
    correctAnswer: 1, // B. Speech difficulty
  },
  {
    id: 4,
    question: "Which food helps prevent NCDs?",
    options: ["A. Samosa", "B. Spinach", "C. Cola", "D. Chips"],
    correctAnswer: 1, // B. Spinach
  },
  {
    id: 5,
    question: "Smokeless tobacco increases the risk of which disease?",
    options: ["A. Asthma", "B. Oral cancer", "C. Osteoarthritis", "D. Migraine"],
    correctAnswer: 1, // B. Oral cancer
  },
  {
    id: 6,
    question: "Alcohol use increases the risk of:",
    options: ["A. Cataract", "B. Psoriasis", "C. Cancer", "D. Arthritis"],
    correctAnswer: 2, // C. Cancer
  },
  {
    id: 7,
    question: "Physical inactivity increases the risk of:",
    options: ["A. Epilepsy", "B. Obesity", "C. Glaucoma", "D. Parkinson's disease"],
    correctAnswer: 1, // B. Obesity
  },
  {
    id: 8,
    question: "Excessive sedentary screen time increases risk of:",
    options: ["A. Kidney stones", "B. Obesity", "C. Thyroid disorders", "D. Varicose veins"],
    correctAnswer: 1, // B. Obesity
  },
  {
    id: 9,
    question: "Poor sleep increases risk of:",
    options: ["A. Scoliosis", "B. Diabetes", "C. Psoriasis", "D. Osteoarthritis"],
    correctAnswer: 1, // B. Diabetes
  },
  {
    id: 10,
    question: "Which lifestyle choice helps prevent NCDs?",
    options: ["A. Skipping meals", "B. Regular exercise", "C. Excessive gaming", "D. Midnight snacking"],
    correctAnswer: 1, // B. Regular exercise
  },
];

interface Module {
  id: number;
  title: string;
  description: string;
  color: string;
}

export default function Home() {
  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // User login state
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  // Image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loginHeading, setLoginHeading] = useState<string>("Login");
  
  // Modules slide panel state
  const [isModulesPanelOpen, setIsModulesPanelOpen] = useState<boolean>(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Login history modal state
  const [showLoginHistory, setShowLoginHistory] = useState<boolean>(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string>("");

  // Admin save success/error message (shown after save)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Track which item was just saved so we can highlight it
  const [lastSavedItem, setLastSavedItem] = useState<{
    type: "module" | "question" | "video" | "module-add";
    moduleId: number;
    questionId?: number;
  } | null>(null);
  
  // Disable body scroll when dropdown is open
  useEffect(() => {
    if (isModulesPanelOpen) {
      // Disable scroll on body
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scroll on body
      document.body.style.overflow = '';
    }
    
    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModulesPanelOpen]);

  // Disable body scroll when confirmation modal is open
  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showConfirmModal]);

  // Disable body scroll when login history modal is open
  useEffect(() => {
    if (showLoginHistory) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLoginHistory]);

  // Handle Escape key to close confirmation modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showConfirmModal) {
        setShowConfirmModal(false);
        setConfirmModalData(null);
      }
    };

    if (showConfirmModal) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showConfirmModal]);
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setIsUserLoggedIn(true);
            setUserName(data.user.username);
            setUserEmail(data.user.email || '');
            setUserRole(data.user.role);
            setIsAdmin(data.user.role === 'admin');
          }
        } else if (response.status === 401) {
          // User is not authenticated - this is normal, don't log as error
          // Silently handle unauthenticated state
        }
      } catch (error) {
        // Only log unexpected errors, not 401s
        if (error instanceof Error && !error.message.includes('401')) {
          console.error('Error checking auth:', error);
        }
      }
    };
    checkAuth();
  }, []);

  // Process pending uploads on mount and periodically
  useEffect(() => {
    const processUploads = async () => {
      try {
        const pending = await getPendingUploads();
        if (pending.length > 0) {
          console.log(`Found ${pending.length} pending upload(s), processing in background...`);
          // Process uploads in background
          processPendingUploads((videoId, progress) => {
            // Update progress for any pending uploads
            const video = pending.find(v => v.id === videoId);
            if (video) {
              const progressKey = `${video.moduleId}-${video.videoType}`;
              setUploadProgress(prev => ({
                ...prev,
                [progressKey]: progress,
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error processing pending uploads:', error);
      }
    };

    // Process on mount
    processUploads();

    // Process every 30 seconds to catch any missed uploads
    const interval = setInterval(processUploads, 30000);

    return () => clearInterval(interval);
  }, []);

  // Refetch all data from APIs (modules, questions, answers, videos) - used after admin saves
  const refetchData = useCallback(async () => {
    try {
      const modulesResponse = await getModules();
      if (modulesResponse.success && modulesResponse.data?.modules) {
        const apiModules: Module[] = modulesResponse.data.modules.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          color: m.color,
        }));
        if (apiModules.length > 0) {
          setModules(apiModules);
        } else {
          setModules(defaultModules);
        }
      } else {
        setModules(defaultModules);
      }

      const questionsResponse = await getQuestions();
      if (questionsResponse.success && questionsResponse.data?.questions) {
        const apiQuestions: { [moduleId: number]: Question[] } = {};
        questionsResponse.data.questions.forEach((q: QuestionData) => {
          if (!apiQuestions[q.moduleId]) {
            apiQuestions[q.moduleId] = [];
          }
          apiQuestions[q.moduleId].push({
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
          });
        });
        setModuleQuestions(apiQuestions);
      }

      if (isUserLoggedIn) {
        try {
          const answersResponse = await getAnswers();
          if (answersResponse.success && answersResponse.data?.answers) {
            const apiAnswers: { [moduleId: number]: { [questionId: number]: string } } = {};
            answersResponse.data.answers.forEach((a: any) => {
              if (!apiAnswers[a.moduleId]) {
                apiAnswers[a.moduleId] = {};
              }
              apiAnswers[a.moduleId][a.questionId] = a.answer;
            });
            setSavedAnswers(apiAnswers);
          }
        } catch (error) {
          console.debug('Could not load answers:', error);
        }
      }

      if (isUserLoggedIn || isAdmin) {
        try {
          const videosResponse = await getVideos();
          if (videosResponse.success && videosResponse.data?.videos) {
            const apiVideos: {
              [moduleId: number]: {
                english: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
                punjabi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
                hindi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
                activity: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
              };
            } = {};
            videosResponse.data.videos.forEach((v: VideoData) => {
              if (!apiVideos[v.moduleId]) {
                apiVideos[v.moduleId] = {
                  english: [],
                  punjabi: [],
                  hindi: [],
                  activity: [],
                };
              }
              apiVideos[v.moduleId][v.videoType].push({
                id: v.videoId,
                preview: v.preview,
                fileName: v.fileName,
                fileSize: v.fileSize,
                ...(v.fileUrl && { fileUrl: v.fileUrl }), // Include fileUrl for video playback if available
              });
            });
            setVideos(apiVideos);
          }
        } catch (error) {
          console.debug('Could not load videos:', error);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Authentication') && !errorMessage.includes('Database')) {
        console.error('Error loading data from APIs:', error);
      }
      setModules(defaultModules);
    }
  }, [isUserLoggedIn, isAdmin]);

  // Load data on mount and when auth changes; also load image/heading from localStorage
  useEffect(() => {
    const storedImage = localStorage.getItem('adminUploadedImage');
    if (storedImage) setSelectedImage(storedImage);
    const storedLoginHeading = localStorage.getItem('adminLoginHeading');
    if (storedLoginHeading) setLoginHeading(storedLoginHeading);
    refetchData();
  }, [refetchData]);

  // Show save feedback toast (success or error) and optionally highlight the saved item
  const showSaveFeedback = useCallback((
    type: "success" | "error",
    text: string,
    savedItem?: { type: "module" | "question" | "video" | "module-add"; moduleId: number; questionId?: number } | null
  ) => {
    setSaveMessage({ type, text });
    if (savedItem) setLastSavedItem(savedItem);
    const t = setTimeout(() => {
      setSaveMessage(null);
      setLastSavedItem(null);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const [showUserLogin, setShowUserLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<'user' | 'admin'>('user');
  const [userPopupView, setUserPopupView] = useState<'login' | 'create'>('login');
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminLoading(true);
    setAdminLoginError("");

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.user.role === 'admin') {
          setIsAdmin(true);
          setIsUserLoggedIn(true);
          setUserName(data.user.username);
          setUserEmail(data.user.email || '');
          setUserRole(data.user.role);
          setShowAdminLogin(false);
          setAdminUsername("");
          setAdminPassword("");
          setAdminLoginError("");
        } else {
          setAdminLoginError("This account is not an admin account.");
        }
      } else {
        setAdminLoginError(data.message || data.error || "Invalid credentials. Please try again.");
        setAdminPassword("");
      }
    } catch (error) {
      console.error('Login error:', error);
      setAdminLoginError("An error occurred during login. Please try again.");
      setAdminPassword("");
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsAdmin(false);
    setIsUserLoggedIn(false);
    setUserName("");
    setUserEmail("");
    setUserRole("");
    setEditingModule(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError("");

    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail) {
      setLoginError("Please enter your email.");
      setIsLoginLoading(false);
      return;
    }
    if (!loginPassword) {
      setLoginError("Please enter your password.");
      setIsLoginLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: loginPassword }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsUserLoggedIn(true);
        setUserName(data.user.username || data.user.email);
        setUserEmail(data.user.email || '');
        setUserRole(data.user.role);
        setIsAdmin(data.user.role === 'admin');
        setShowUserLogin(false);
        setLoginEmail("");
        setLoginPassword("");
        setLoginError("");
      } else {
        setLoginError(data.message || data.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error('User login error:', error);
      setLoginError("An error occurred during login. Please try again.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreateLoading(true);
    setCreateError("");

    const trimmedEmail = createEmail.trim();
    if (!trimmedEmail) {
      setCreateError("Please enter your email.");
      setIsCreateLoading(false);
      return;
    }
    if (!createPassword) {
      setCreateError("Please set a password.");
      setIsCreateLoading(false);
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateError("Password and confirm password do not match.");
      setIsCreateLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: createPassword }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsUserLoggedIn(true);
        setUserName(data.user.username || data.user.email);
        setUserEmail(data.user.email || '');
        setUserRole(data.user.role);
        setIsAdmin(data.user.role === 'admin');
        setShowUserLogin(false);
        setCreateEmail("");
        setCreatePassword("");
        setCreateConfirmPassword("");
        setCreateError("");
      } else {
        setCreateError(data.message || data.error || "Could not create account. Email may already be registered.");
      }
    } catch (error) {
      console.error('Create account error:', error);
      setCreateError("An error occurred. Please try again.");
    } finally {
      setIsCreateLoading(false);
    }
  };

  const handleUserLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsUserLoggedIn(false);
    setIsAdmin(false);
    setUserName("");
    setUserEmail("");
    setUserRole("");
  };

  const fetchLoginHistory = async () => {
    setIsLoadingHistory(true);
    setHistoryError("");
    try {
      const response = await fetch('/api/auth/login-history?limit=100');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setLoginHistory(data.data.logins || []);
      } else {
        setHistoryError(data.message || data.error || 'Failed to load login history');
      }
    } catch (error) {
      console.error('Error fetching login history:', error);
      setHistoryError('An error occurred while loading login history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  
  // State for module details - track which modules have details open
  const [moduleDetailsOpen, setModuleDetailsOpen] = useState<{ [key: number]: boolean }>({});
  const [moduleView, setModuleView] = useState<{ [key: number]: "videos" | "questions" | null }>({});
  const [selectedVideoType, setSelectedVideoType] = useState<{ [key: number]: "english" | "punjabi" | "hindi" | "activity" | null }>({});

  // Reload videos when a video type is selected to ensure fresh data
  useEffect(() => {
    const reloadVideosForModule = async (moduleId: number) => {
      try {
        const videosResponse = await getVideos(moduleId);
        if (videosResponse.success && videosResponse.data?.videos) {
          const moduleVideos: {
            english: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
            punjabi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
            hindi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
            activity: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
          } = {
            english: [],
            punjabi: [],
            hindi: [],
            activity: [],
          };
          
          videosResponse.data.videos.forEach((v: VideoData) => {
            moduleVideos[v.videoType].push({
              id: v.videoId,
              preview: v.preview,
              fileName: v.fileName,
              fileSize: v.fileSize,
              ...(v.fileUrl && { fileUrl: v.fileUrl }), // Include fileUrl for video playback if available
            });
          });
          
          setVideos(prev => ({
            ...prev,
            [moduleId]: moduleVideos
          }));
        }
      } catch (error) {
        console.error('Error reloading videos for module:', error);
      }
    };

    // Reload videos for any module that has a selected video type
    Object.keys(selectedVideoType).forEach(moduleIdStr => {
      const moduleId = Number(moduleIdStr);
      if (selectedVideoType[moduleId]) {
        reloadVideosForModule(moduleId);
      }
    });
  }, [selectedVideoType]);
  
  // Videos state for all modules - initialize empty to avoid hydration errors
  const [videos, setVideos] = useState<{
    [moduleId: number]: {
      english: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
      punjabi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
      hindi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
      activity: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }>;
    };
  }>({});

  // Pending videos - uploaded but not yet saved (only visible to admin)
  const [pendingVideos, setPendingVideos] = useState<{
    [moduleId: number]: {
      english: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }> | null;
      punjabi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }> | null;
      hindi: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }> | null;
      activity: Array<{ id: number; preview: string; fileName: string; fileSize: number; fileUrl?: string }> | null;
    };
  }>({});

  // State for 8 editable modules - use defaults initially
  const defaultModules: Module[] = [
    { id: 1, title: "Introduction to NCDs+", description: "Understanding Non-Communicable Diseases and their impact on adolescent health. This module covers the basics of NCDs, the Big-7 risk factors, and how to identify and prevent these diseases.", color: "pink" },
    { id: 2, title: "Module 2 Title", description: "Module 2 description. Click to edit this text and customize the content for your module.", color: "blue" },
    { id: 3, title: "Module 3 Title", description: "Module 3 description. Click to edit this text and customize the content for your module.", color: "green" },
    { id: 4, title: "Module 4 Title", description: "Module 4 description. Click to edit this text and customize the content for your module.", color: "purple" },
    { id: 5, title: "Module 5 Title", description: "Module 5 description. Click to edit this text and customize the content for your module.", color: "orange" },
    { id: 6, title: "Module 6 Title", description: "Module 6 description. Click to edit this text and customize the content for your module.", color: "indigo" },
    { id: 7, title: "Module 7 Title", description: "Module 7 description. Click to edit this text and customize the content for your module.", color: "teal" },
    { id: 8, title: "Module 8 Title", description: "Module 8 description. Click to edit this text and customize the content for your module.", color: "red" },
  ];

  const [modules, setModules] = useState<Module[]>(defaultModules);

  // Questions state - per module
  const [moduleQuestions, setModuleQuestions] = useState<{
    [moduleId: number]: Question[];
  }>(() => {
    // Initialize with default questions for existing modules
    const initial: { [moduleId: number]: Question[] } = {};
    defaultModules.forEach(module => {
      initial[module.id] = defaultQuestions.map(q => ({ ...q }));
    });
    return initial;
  });

  // Question editing state
  const [editingQuestion, setEditingQuestion] = useState<{ moduleId: number; questionId: number } | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionOptions, setEditQuestionOptions] = useState<string[]>([]);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState<number | undefined>(undefined);

  // Saved answers state - to allow editing submitted answers
  const [savedAnswers, setSavedAnswers] = useState<{ [moduleId: number]: { [questionId: number]: string } }>({});

  const [editingModule, setEditingModule] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Login heading editable state
  const [isEditingLoginHeading, setIsEditingLoginHeading] = useState<boolean>(false);

  const handleEditModule = (module: Module) => {
    if (!isAdmin) return; // Only allow editing if admin is logged in
    setEditingModule(module.id);
    setEditTitle(module.title);
    setEditDescription(module.description);
  };

  const handleSaveModule = async (moduleId: number) => {
    if (!isAdmin) return; // Only allow saving if admin is logged in
    
    try {
      const response = await updateModule(moduleId, {
        title: editTitle,
        description: editDescription,
      });
      
      if (response.success && response.data?.module) {
        await refetchData();
        showSaveFeedback('success', 'Module updated successfully.', { type: 'module', moduleId });
      } else {
        showSaveFeedback('error', response.error || 'Failed to update module');
      }
    } catch (error) {
      console.error('Error saving module:', error);
      showSaveFeedback('error', 'An error occurred while saving the module. Please try again.');
    }
    
    setEditingModule(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleCancelEdit = () => {
    setEditingModule(null);
    setEditTitle("");
    setEditDescription("");
  };

  // Question editing functions
  const handleEditQuestion = (moduleId: number, question: Question) => {
    if (!isAdmin) return;
    setEditingQuestion({ moduleId, questionId: question.id });
    setEditQuestionText(question.question);
    setEditQuestionOptions([...question.options]);
    setEditCorrectAnswer(question.correctAnswer !== undefined ? question.correctAnswer : undefined);
  };

  const handleSaveQuestion = async () => {
    if (!isAdmin || !editingQuestion) return;
    
    // Validation
    if (!editQuestionText.trim()) {
      alert('Please enter a question text.');
      return;
    }
    
    if (editQuestionOptions.length < 2) {
      alert('Please add at least 2 answer options.');
      return;
    }
    
    if (editQuestionOptions.some(opt => !opt.trim())) {
      alert('Please fill in all answer options.');
      return;
    }
    
    if (editCorrectAnswer === undefined || editCorrectAnswer === null) {
      alert('Please select the correct answer for this question.');
      return;
    }
    
    const { moduleId, questionId } = editingQuestion;
    
    try {
      const response = await updateQuestion(questionId, moduleId, {
        question: editQuestionText.trim(),
        options: editQuestionOptions.map(opt => opt.trim()),
        correctAnswer: editCorrectAnswer,
      });
      
      if (response.success && response.data?.question) {
        const updatedQuestion = response.data.question;
        const updatedQuestions = (moduleQuestions[moduleId] || []).map(q =>
          q.id === questionId
            ? {
                id: updatedQuestion.id,
                question: updatedQuestion.question,
                options: updatedQuestion.options,
                correctAnswer: updatedQuestion.correctAnswer,
              }
            : q
        );

        const updatedModuleQuestions = {
          ...moduleQuestions,
          [moduleId]: updatedQuestions
        };
        
        setModuleQuestions(updatedModuleQuestions);
        await refetchData();
        showSaveFeedback('success', 'Question updated successfully.', { type: 'question', moduleId, questionId });
      } else {
        showSaveFeedback('error', response.error || 'Failed to update question');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      showSaveFeedback('error', 'An error occurred while saving the question. Please try again.');
    }
    
    setEditingQuestion(null);
    setEditQuestionText("");
    setEditQuestionOptions([]);
    setEditCorrectAnswer(undefined);
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestion(null);
    setEditQuestionText("");
    setEditQuestionOptions([]);
    setEditCorrectAnswer(undefined);
  };

  const handleEditQuestionOption = (index: number, value: string) => {
    const newOptions = [...editQuestionOptions];
    newOptions[index] = value;
    setEditQuestionOptions(newOptions);
  };

  const handleAddQuestionOption = () => {
    setEditQuestionOptions([...editQuestionOptions, ""]);
  };

  const handleRemoveQuestionOption = (index: number) => {
    if (editQuestionOptions.length > 1) {
      const newOptions = editQuestionOptions.filter((_, i) => i !== index);
      setEditQuestionOptions(newOptions);
      
      // Adjust correct answer index if needed
      if (editCorrectAnswer !== undefined) {
        if (editCorrectAnswer === index) {
          // If we removed the correct answer, clear it
          setEditCorrectAnswer(undefined);
        } else if (editCorrectAnswer > index) {
          // If we removed an option before the correct answer, decrement the index
          setEditCorrectAnswer(editCorrectAnswer - 1);
        }
      }
    }
  };

  // Add new module function
  const handleAddModule = async () => {
    if (!isAdmin) return;
    
    const newModuleId = Math.max(...modules.map(m => m.id), 0) + 1;
    const colors = ["pink", "blue", "green", "purple", "orange", "indigo", "teal", "red"];
    const newColor = colors[(newModuleId - 1) % colors.length];
    
    const newModuleData: ModuleData = {
      id: newModuleId,
      title: `Module ${newModuleId} Title`,
      description: `Module ${newModuleId} description. Click to edit this text and customize the content for your module.`,
      color: newColor
    };

    try {
      // Create module via API
      const moduleResponse = await createModule(newModuleData);
      
      if (moduleResponse.success && moduleResponse.data?.module) {
        const createdModule = moduleResponse.data.module;
        const newModule: Module = {
          id: createdModule.id,
          title: createdModule.title,
          description: createdModule.description,
          color: createdModule.color,
        };

        const updatedModules = [...modules, newModule];
        setModules(updatedModules);

        // Create default questions for new module via API
        const questionsToCreate = defaultQuestions.map(q => ({
          id: q.id,
          moduleId: newModuleId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
        }));

        const questionPromises = questionsToCreate.map(q => createQuestion(q));
        const questionResults = await Promise.all(questionPromises);
        
        // Initialize questions in state
        const createdQuestions: Question[] = questionResults
          .filter(r => r.success && r.data?.question)
          .map(r => ({
            id: r.data!.question.id,
            question: r.data!.question.question,
            options: r.data!.question.options,
            correctAnswer: r.data!.question.correctAnswer,
          }));

        const updatedQuestions = {
          ...moduleQuestions,
          [newModuleId]: createdQuestions.length > 0 ? createdQuestions : defaultQuestions.map(q => ({ ...q }))
        };
        setModuleQuestions(updatedQuestions);

        // Initialize videos for new module
        const updatedVideos = {
          ...videos,
          [newModuleId]: {
            english: [],
            punjabi: [],
            hindi: [],
            activity: []
          }
        };
        setVideos(updatedVideos);

        await refetchData();
        showSaveFeedback('success', 'Module created successfully.', { type: 'module-add', moduleId: createdModule.id });
      } else {
        showSaveFeedback('error', moduleResponse.error || 'Failed to create module');
      }
    } catch (error) {
      console.error('Error creating new module:', error);
      showSaveFeedback('error', 'An error occurred while creating the module. Please try again.');
    }
  };

  // Remove module function
  const handleRemoveModule = async (moduleId: number) => {
    if (!isAdmin) return;
    
    // Show custom confirmation modal
    setConfirmModalData({
      title: "Delete Module",
      message: "Are you sure you want to remove this module? This will also delete all associated questions and videos. This action cannot be undone.",
      onConfirm: async () => {
        setShowConfirmModal(false);
        await performModuleDeletion(moduleId);
      }
    });
    setShowConfirmModal(true);
  };

  // Perform actual module deletion
  const performModuleDeletion = async (moduleId: number) => {
    try {
      // Delete module via API (this will cascade delete questions and videos if configured)
      const response = await deleteModule(moduleId);
      
      if (response.success) {
        // Remove module from modules array
        const updatedModules = modules.filter(m => m.id !== moduleId);
        setModules(updatedModules);

        // Remove questions for this module
        const updatedQuestions = { ...moduleQuestions };
        delete updatedQuestions[moduleId];
        setModuleQuestions(updatedQuestions);

        // Remove videos for this module
        const updatedVideos = { ...videos };
        delete updatedVideos[moduleId];
        setVideos(updatedVideos);

        // Remove pending videos for this module
        const updatedPendingVideos = { ...pendingVideos };
        delete updatedPendingVideos[moduleId];
        setPendingVideos(updatedPendingVideos);

        // Close any open views/details for this module
        const updatedModuleDetailsOpen = { ...moduleDetailsOpen };
        delete updatedModuleDetailsOpen[moduleId];
        setModuleDetailsOpen(updatedModuleDetailsOpen);

        const updatedModuleView = { ...moduleView };
        delete updatedModuleView[moduleId];
        setModuleView(updatedModuleView);

        const updatedSelectedVideoType = { ...selectedVideoType };
        delete updatedSelectedVideoType[moduleId];
        setSelectedVideoType(updatedSelectedVideoType);

        await refetchData();
        showSaveFeedback('success', 'Module deleted successfully.');
      } else {
        showSaveFeedback('error', response.error || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      showSaveFeedback('error', 'An error occurred while deleting the module. Please try again.');
    }
  };

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; border: string; hover: string } } = {
      pink: { bg: "bg-pink-500", border: "border-pink-300", hover: "hover:border-pink-400" },
      blue: { bg: "bg-blue-500", border: "border-blue-300", hover: "hover:border-blue-400" },
      green: { bg: "bg-green-500", border: "border-green-300", hover: "hover:border-green-400" },
      purple: { bg: "bg-purple-500", border: "border-purple-300", hover: "hover:border-purple-400" },
      orange: { bg: "bg-orange-500", border: "border-orange-300", hover: "hover:border-orange-400" },
      indigo: { bg: "bg-indigo-500", border: "border-indigo-300", hover: "hover:border-indigo-400" },
      teal: { bg: "bg-teal-500", border: "border-teal-300", hover: "hover:border-teal-400" },
      red: { bg: "bg-red-500", border: "border-red-300", hover: "hover:border-red-400" },
    };
    return colors[color] || colors.pink;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      
      // Check file size (limit to 2MB for images to avoid quota issues)
      const maxImageSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxImageSize) {
        alert(`Image file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 2MB. Please compress the image and try again.`);
        return;
      }
      
      // Create preview URL and save to localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setSelectedImage(imageData);
        // Save to localStorage so all users can see it
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('adminUploadedImage', imageData);
          } catch (error: any) {
            if (error.name === 'QuotaExceededError') {
              alert('Storage limit reached. The image is displayed but may not persist after page refresh. Please remove some content or use a smaller image.');
            } else {
              console.error('Error saving image:', error);
            }
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    // Remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminUploadedImage');
    }
  };

  // Upload progress state - tracks progress for each module/videoType combination
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: UploadProgress;
  }>({});

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>, moduleId: number) => {
    if (!isAdmin) return; // Only admin can upload videos
    
    const videoType = selectedVideoType[moduleId];
    if (!videoType) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    const currentVideos = videos[moduleId]?.[videoType] || [];
    const pendingVideo = pendingVideos[moduleId]?.[videoType];
    const hasSavedVideo = currentVideos.length >= 1;
    const hasPendingVideo = pendingVideo && pendingVideo.length > 0;

    // Limit to 1 video per type (check both saved and pending)
    if (hasSavedVideo || hasPendingVideo) {
      alert(`You can only upload 1 video for ${videoType}. Please remove or save the existing video first.`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      alert(`${file.name} is not a video file. Please select a video file.`);
      return;
    }

    // Validate file size (5GB max to support 20-minute videos)
    const maxVideoSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxVideoSize) {
      alert(`Video file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5GB.`);
      return;
    }

    // Warn about large files
    const largeFileThreshold = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > largeFileThreshold) {
      const proceed = confirm(`Video file is large (${(file.size / 1024 / 1024).toFixed(2)}MB). Large videos will be compressed automatically. Continue?`);
      if (!proceed) return;
    }

    // Initialize upload progress
    const progressKey = `${moduleId}-${videoType}`;
    
    try {
      // Step 1: Store video file locally first (IndexedDB)
      setUploadProgress(prev => ({
        ...prev,
        [progressKey]: {
          stage: 'uploading',
          progress: 0,
          message: 'Storing video file...',
          originalSize: file.size,
        },
      }));

      // Video is being stored - no need to show message, will show success after storage

      // Store video in IndexedDB
      const storedVideoId = await storeVideo(file, moduleId, videoType);
      
      console.log('Video stored locally:', storedVideoId);

      // Show immediate feedback that file is stored
      showSaveFeedback('success', 'Video stored! Uploading to Cloudinary in background...', { type: 'video', moduleId });

      console.log('[Video Upload] Video stored locally, starting Cloudinary upload...', {
        storedVideoId,
        fileName: file.name,
        fileSize: file.size,
        moduleId,
        videoType,
      });

      // Don't create blob URL - wait for Cloudinary upload to complete
      // This prevents ERR_FILE_NOT_FOUND errors from blob URLs
      const newVideo: any = {
        id: Date.now(),
        preview: '', // Will be updated with Cloudinary thumbnail
        fileName: file.name,
        fileSize: file.size,
        fileUrl: '', // Will be updated with Cloudinary secure_url when upload completes
        publicId: undefined,
        storedVideoId, // Store the ID for tracking background upload
      };

      // Set pending video without blob URL - will update when Cloudinary upload completes
      setPendingVideos(prev => ({
        ...prev,
        [moduleId]: {
          ...(prev[moduleId] || { english: null, punjabi: null, hindi: null, activity: null }),
          [videoType]: [newVideo]
        }
      }));

      // Step 2: Upload to Cloudinary in background (non-blocking)
      // This runs asynchronously and updates progress
      let lastMessageProgress = 0; // Track last message shown to avoid spam
      
      uploadVideoInBackground(storedVideoId, (progress) => {
        // Always update progress state (for progress bar)
        setUploadProgress(prev => ({
          ...prev,
          [progressKey]: progress,
        }));

        // Only show messages at 50% and 100% to avoid spam
        if (progress.stage === 'uploading') {
          // Show message at 50% (only once)
          if (progress.progress >= 50 && lastMessageProgress < 50) {
            lastMessageProgress = 50;
            // Show 50% progress - using success type for info message
            showSaveFeedback('success', `Uploading to Cloudinary... 50%`, { type: 'video', moduleId });
          }
          // 100% message will be shown in the .then() below
        }
      }).then(async (result) => {
        console.log('[Video Upload] Cloudinary upload result:', result);
        
        if (result.success && result.video) {
          // Upload complete - use secure_url for HTTPS playback
          // Prefer secure_url over url for better security and compatibility
          const videoUrl = result.video.secure_url || result.video.url;
          const publicId = result.video.publicId;
          
          if (!videoUrl) {
            console.error('[Video Upload] No video URL returned from Cloudinary upload:', result);
            showSaveFeedback('error', 'Upload completed but video URL is missing. Please try again.', { type: 'video', moduleId });
            return;
          }
          
          // Apply Cloudinary transformations: f_mp4 for explicit format, f_auto for fallback, q_auto for quality
          // Format: /upload/f_mp4,f_auto,q_auto/
          let optimizedVideoUrl = videoUrl;
          if (videoUrl.includes('/upload/') && !videoUrl.includes('f_mp4')) {
            // Remove any existing transformations first
            optimizedVideoUrl = videoUrl.replace(/\/upload\/[^\/]+\//, '/upload/');
            // Apply transformations
            optimizedVideoUrl = optimizedVideoUrl.replace('/upload/', '/upload/f_mp4,f_auto,q_auto/');
          }
          
          console.log('[Video Upload] Video URL optimized:', {
            original: videoUrl,
            optimized: optimizedVideoUrl,
            publicId,
          });
          
          // Generate preview thumbnail from Cloudinary
          const preview = publicId 
            ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'adohealth'}/video/upload/w_640,h_360,c_fill/${publicId}.jpg`
            : optimizedVideoUrl;

          // Save video metadata to backend immediately for preview
          try {
            const token = localStorage.getItem('authToken');
            if (token) {
              const metadataResponse = await fetch('/api/upload-video', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  ...result.video,
                  moduleId,
                  videoType,
                  fileName: file.name,
                  fileSize: result.video.fileSize || file.size,
                }),
              });

              if (metadataResponse.ok) {
                const metadataData = await metadataResponse.json();
                console.log('[Video Upload] Video metadata saved:', metadataData);
                
                // Use the fileUrl from the saved video if available
                if (metadataData.video?.fileUrl) {
                  optimizedVideoUrl = metadataData.video.fileUrl;
                }
              } else {
                console.warn('[Video Upload] Failed to save metadata, but video is uploaded:', await metadataResponse.text());
              }
            }
          } catch (metadataError) {
            console.error('[Video Upload] Error saving metadata:', metadataError);
            // Continue even if metadata save fails - video is still uploaded
          }

          // Update pending video with Cloudinary info - use optimized secure_url
          // This triggers React re-render with the correct Cloudinary URL for immediate preview
          setPendingVideos(prev => {
            const updated = {
              ...prev,
              [moduleId]: {
                ...(prev[moduleId] || { english: null, punjabi: null, hindi: null, activity: null }),
                [videoType]: [{
                  ...newVideo,
                  preview, // Cloudinary thumbnail
                  fileUrl: optimizedVideoUrl, // Cloudinary secure_url with transformations for immediate preview
                  publicId,
                }]
              }
            };
            
            console.log('[Video Upload] Updated pending videos state for immediate preview:', updated[moduleId]?.[videoType]);
            return updated;
          });

          // Clear upload progress
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[progressKey];
            return updated;
          });

          console.log('[Video Upload] Upload complete, video ready for immediate preview:', {
            fileUrl: optimizedVideoUrl,
            preview,
            publicId,
            fileName: file.name,
            fileSize: file.size,
          });

          showSaveFeedback('success', 'Video uploaded! You can preview it below. Click "Save Video" to make it available to all users.', { type: 'video', moduleId });
        } else {
          // Upload failed
          console.error('[Video Upload] Upload failed:', result.error);
          
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[progressKey];
            return updated;
          });

          showSaveFeedback('error', `Background upload failed: ${result.error || 'Unknown error'}. Video is stored locally and will retry.`, { type: 'video', moduleId });
        }
      }).catch((error) => {
        console.error('[Video Upload] Background upload error:', error);
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[progressKey];
          return updated;
        });

        showSaveFeedback('error', `Upload error: ${error.message || 'Unknown error'}. Video is stored locally.`, { type: 'video', moduleId });
      });
    } catch (error: any) {
      console.error('Error uploading video:', error);
      
      // Clear upload progress on error
      setUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[progressKey];
        return updated;
      });

      // Provide user-friendly error messages
      let errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again as an admin.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (errorMessage.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      showSaveFeedback('error', `Failed to upload video: ${errorMessage}`, { type: 'video', moduleId });
    } finally {
      // Reset input
      event.target.value = '';
    }
  };

  const handleSaveVideo = async (moduleId: number) => {
    if (!isAdmin) return; // Only admin can save videos
    
    const videoType = selectedVideoType[moduleId];
    if (!videoType) return;
    
    const pendingVideo = pendingVideos[moduleId]?.[videoType];
    if (!pendingVideo || pendingVideo.length === 0) return;

    const videoToSave = pendingVideo[0];
    
    try {
      // Get the next video ID for this module and video type
      const existingVideos = videos[moduleId]?.[videoType] || [];
      const nextVideoId = existingVideos.length > 0 
        ? Math.max(...existingVideos.map(v => v.id)) + 1 
        : 1;
      
      // Create video via API - include fileUrl for playback
      const videoData: VideoData = {
        moduleId,
        videoType: videoType as 'english' | 'punjabi' | 'hindi' | 'activity',
        videoId: nextVideoId,
        preview: videoToSave.preview,
        fileName: videoToSave.fileName,
        fileSize: videoToSave.fileSize,
        fileUrl: videoToSave.fileUrl, // Include fileUrl for video playback
      };
      
      const response = await createVideo(videoData);
      
      if (response.success && response.data?.video) {
        const createdVideo = response.data.video;
        
        // Update videos state - include fileUrl for playback
        const updatedVideos = {
          ...videos,
          [moduleId]: {
            ...(videos[moduleId] || { english: [], punjabi: [], hindi: [], activity: [] }),
            [videoType]: [
              ...(videos[moduleId]?.[videoType] || []),
              {
                id: createdVideo.videoId,
                preview: createdVideo.preview,
                fileName: createdVideo.fileName,
                fileSize: createdVideo.fileSize,
                fileUrl: createdVideo.fileUrl || videoToSave.fileUrl, // Include fileUrl for playback
              }
            ]
          }
        };
        setVideos(updatedVideos);
        
        // Clear pending video
        setPendingVideos(prev => ({
          ...prev,
          [moduleId]: {
            ...(prev[moduleId] || { english: null, punjabi: null, hindi: null, activity: null }),
            [videoType]: null
          }
        }));

        await refetchData();
        showSaveFeedback('success', 'Video saved successfully. All users can now view this video.', { type: 'video', moduleId });
      } else {
        showSaveFeedback('error', response.error || 'Failed to save video');
      }
    } catch (error: any) {
      console.error('Error saving video:', error);
      showSaveFeedback('error', 'Error saving video: ' + (error.message || 'Unknown error') + '. Please try again.');
    }
  };

  const handleRemoveVideo = async (moduleId: number, id: number) => {
    if (!isAdmin) return; // Only admin can remove videos
    
    const videoType = selectedVideoType[moduleId];
    if (!videoType) return;
    
    try {
      // Delete video via API
      const response = await deleteVideo(id, moduleId, videoType);
      
      if (response.success) {
        const updatedVideos = {
          ...videos,
          [moduleId]: {
            ...videos[moduleId],
            [videoType]: videos[moduleId][videoType].filter(video => video.id !== id)
          }
        };
        setVideos(updatedVideos);
        await refetchData();
        showSaveFeedback('success', 'Video deleted successfully.', { type: 'video', moduleId });
      } else {
        showSaveFeedback('error', response.error || 'Failed to delete video');
      }
    } catch (error: any) {
      console.error('Error removing video:', error);
      showSaveFeedback('error', 'An error occurred while deleting the video. Please try again.');
    }
  };

  const handleCancelPendingVideo = (moduleId: number) => {
    if (!isAdmin) return; // Only admin can cancel pending videos
    
    const videoType = selectedVideoType[moduleId];
    if (!videoType) return;
    
    setPendingVideos(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || { english: null, punjabi: null, hindi: null, activity: null }),
        [videoType]: null
      }
    }));
  };

  const handleSubmitAnswers = async (event: React.FormEvent<HTMLFormElement>, moduleId: number) => {
    event.preventDefault();
    
    // Collect all form answers
    const formData = new FormData(event.currentTarget);
    const answers: { [key: string]: string } = {};
    
    const questions = moduleQuestions[moduleId] || [];
    questions.forEach((q) => {
      const answer = formData.get(`question-${q.id}`);
      if (answer) {
        answers[`Question ${q.id}`] = answer as string;
      }
    });

    // Format answers for email
    const selectedModule = modules.find(m => m.id === moduleId);
    const emailSubject = `${selectedModule?.title || `Module ${moduleId}`} Pre-Post Questions Answers`;
    let emailBody = `${selectedModule?.title || `Module ${moduleId}`} Pre-Post Questions - Answers\n\n`;
    
    Object.entries(answers).forEach(([question, answer]) => {
      emailBody += `${question}: ${answer}\n`;
    });

    emailBody += "\n\nSubmitted via AdoHealth Initiative Website";

    try {
      // 1. Save answers to API first so they show in admin section even if email fails
      const answersToSave: { [questionId: number]: string } = {};
      const answerPromises: Promise<any>[] = [];
      questions.forEach((q) => {
        const answer = formData.get(`question-${q.id}`);
        if (answer) {
          answersToSave[q.id] = answer as string;
          answerPromises.push(
            submitAnswer({
              moduleId,
              questionId: q.id,
              answer: answer as string,
            })
          );
        }
      });

      let saveOk = false;
      try {
        const answerResults = await Promise.all(answerPromises);
        saveOk = answerResults.every(r => r.success);
        if (saveOk) {
          setSavedAnswers(prev => ({ ...prev, [moduleId]: answersToSave }));
        }
      } catch (err) {
        console.error('Error saving answers to API:', err);
      }

      if (!saveOk) {
        alert('Failed to save answers. Please try again.');
        return;
      }

      // 2. Then try to send email (optional; answers already saved for admin)
      let emailSent = false;
      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'adohealthicmr2025@gmail.com',
            subject: emailSubject,
            body: emailBody,
            answers,
          }),
        });
        const data = await response.json().catch(() => ({}));
        emailSent = !!data.success && data.emailSent !== false;
      } catch (err) {
        console.warn('Email send failed:', err);
      }

      if (emailSent) {
        alert('Your answers have been saved and are visible in the admin Users section. A copy was sent to adohealthicmr2025@gmail.com.');
      } else {
        alert('Your answers have been saved and are visible in the admin Users section. (Email notification could not be sent.)');
      }
    } catch (error) {
      console.error('Error submitting answers:', error);
      alert('An error occurred while submitting your answers. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-blue-700">
      {/* Admin save feedback toast */}
      {saveMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-lg shadow-lg text-white font-medium max-w-md text-center ${
            saveMessage.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
          role="alert"
        >
          {saveMessage.text}
        </div>
      )}

      <Header
        isUserLoggedIn={isUserLoggedIn}
        isAdmin={isAdmin}
        userName={userName}
        onLoginClick={() => {
          setShowUserLogin(true);
          setLoginMode('user');
        }}
        onAdminLoginClick={() => {
          setShowUserLogin(true);
          setLoginMode('admin');
        }}
        onLogout={() => {
          if (isUserLoggedIn) handleUserLogout();
          if (isAdmin) handleAdminLogout();
        }}
        onModulesClick={() => {
          setIsModulesPanelOpen(true);
        }}
      />

      {/* Unified Login Modal */}
      {showUserLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[200] flex items-center justify-center p-4">
          <div className="bg-blue-800 rounded-lg shadow-2xl max-w-md w-full mx-4 sm:mx-auto p-4 sm:p-6 relative z-[201] border-2 border-yellow-500 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              {isAdmin && isEditingLoginHeading ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={loginHeading}
                    onChange={(e) => setLoginHeading(e.target.value)}
                    className="text-xl sm:text-2xl font-bold text-yellow-400 border-2 border-yellow-500 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-slate-700 text-white"
                    autoFocus
                    onBlur={() => {
                      setIsEditingLoginHeading(false);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('adminLoginHeading', loginHeading);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingLoginHeading(false);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('adminLoginHeading', loginHeading);
                        }
                      }
                      if (e.key === 'Escape') {
                        setIsEditingLoginHeading(false);
                        const stored = localStorage.getItem('adminLoginHeading');
                        setLoginHeading(stored || 'Login');
                      }
                    }}
                  />
                </div>
              ) : (
                <h2 
                  className="text-xl sm:text-2xl font-bold text-yellow-400"
                  onDoubleClick={() => {
                    if (isAdmin) {
                      setIsEditingLoginHeading(true);
                    }
                  }}
                  style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                  title={isAdmin ? 'Double-click to edit' : ''}
                >
                  {loginHeading}
                </h2>
              )}
              <button
                onClick={() => {
                  setShowUserLogin(false);
                  setLoginMode('user');
                  setUserPopupView('login');
                  setLoginEmail("");
                  setLoginPassword("");
                  setLoginError("");
                  setCreateEmail("");
                  setCreatePassword("");
                  setCreateConfirmPassword("");
                  setCreateError("");
                  setAdminPassword("");
                  setAdminLoginError("");
                }}
                className="text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Login Type Toggle */}
            <div className="mb-6">
              <div className="flex gap-2 bg-slate-700 p-1 rounded-lg border border-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('user');
                    setUserPopupView('login');
                    setLoginEmail("");
                    setLoginPassword("");
                    setCreateEmail("");
                    setCreatePassword("");
                    setCreateConfirmPassword("");
                    setAdminPassword("");
                    setAdminLoginError("");
                  }}
                  className={`flex-1 px-3 sm:px-4 py-2 rounded-md font-semibold text-xs sm:text-sm transition-colors ${
                    loginMode === 'user'
                      ? 'bg-yellow-500 text-slate-900 shadow-lg'
                      : 'text-gray-300 hover:text-yellow-400 hover:bg-slate-600'
                  }`}
                >
                  User Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('admin');
                    setUserPopupView('login');
                    setLoginEmail("");
                    setLoginPassword("");
                    setCreateEmail("");
                    setCreatePassword("");
                    setCreateConfirmPassword("");
                    setLoginError("");
                  }}
                  className={`flex-1 px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                    loginMode === 'admin'
                      ? 'bg-yellow-500 text-slate-900 shadow-lg'
                      : 'text-gray-300 hover:text-yellow-400 hover:bg-slate-600'
                  }`}
                >
                  Admin Login
                </button>
              </div>
            </div>

            {/* User: Login or Create account view */}
            {loginMode === 'user' && userPopupView === 'login' && (
              <form onSubmit={handleUserLogin}>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                    placeholder="Enter your email"
                    autoFocus
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                      className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                {loginError && (
                  <div className="mb-4 p-2 sm:p-3 bg-red-900 border-2 border-red-500 rounded-lg shadow-sm">
                    <p className="text-xs sm:text-sm text-red-300 font-medium">{loginError}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserLogin(false);
                      setLoginEmail("");
                      setLoginPassword("");
                      setLoginError("");
                    }}
                    className="flex-1 min-w-[80px] px-3 sm:px-4 py-2 text-sm sm:text-base bg-slate-600 text-gray-200 font-semibold rounded-lg hover:bg-slate-500 transition-all shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoginLoading}
                    className="flex-1 min-w-[80px] px-3 sm:px-4 py-2 text-sm sm:text-base bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoginLoading ? 'Logging in...' : 'Login'}
                  </button>
                </div>
                <p className="text-center text-xs sm:text-sm text-gray-400">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setUserPopupView('create'); setLoginError(""); }}
                    className="text-yellow-400 hover:text-yellow-300 font-medium underline"
                  >
                    Create account
                  </button>
                </p>
              </form>
            )}

            {/* Create account form: email, set password, confirm password, Create button */}
            {loginMode === 'user' && userPopupView === 'create' && (
              <form onSubmit={handleCreateAccount}>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => { setCreateEmail(e.target.value); setCreateError(""); }}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                    placeholder="Enter your email"
                    autoFocus
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Set password
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      value={createPassword}
                      onChange={(e) => { setCreatePassword(e.target.value); setCreateError(""); }}
                      className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                      placeholder="Set your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      aria-label={showCreatePassword ? "Hide password" : "Show password"}
                    >
                      {showCreatePassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showCreateConfirmPassword ? "text" : "password"}
                      value={createConfirmPassword}
                      onChange={(e) => { setCreateConfirmPassword(e.target.value); setCreateError(""); }}
                      className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreateConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      aria-label={showCreateConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showCreateConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                {createError && (
                  <div className="mb-4 p-2 sm:p-3 bg-red-900 border-2 border-red-500 rounded-lg shadow-sm">
                    <p className="text-xs sm:text-sm text-red-300 font-medium">{createError}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserLogin(false);
                      setCreateEmail("");
                      setCreatePassword("");
                      setCreateConfirmPassword("");
                      setCreateError("");
                    }}
                    className="flex-1 min-w-[80px] px-3 sm:px-4 py-2 text-sm sm:text-base bg-slate-600 text-gray-200 font-semibold rounded-lg hover:bg-slate-500 transition-all shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreateLoading}
                    className="flex-1 min-w-[80px] px-3 sm:px-4 py-2 text-sm sm:text-base bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreateLoading ? 'Creating...' : 'Create'}
                  </button>
                </div>
                <p className="text-center text-xs sm:text-sm text-gray-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setUserPopupView('login'); setCreateError(""); }}
                    className="text-yellow-400 hover:text-yellow-300 font-medium underline"
                  >
                    Login
                  </button>
                </p>
              </form>
            )}

            {/* Admin Login Form */}
            {loginMode === 'admin' && (
              <form onSubmit={handleAdminLogin}>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => {
                      setAdminUsername(e.target.value);
                      setAdminLoginError("");
                    }}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                    placeholder="Enter admin username"
                    autoFocus
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setAdminLoginError("");
                      }}
                      className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                      placeholder="Enter admin password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      aria-label={showAdminPassword ? "Hide password" : "Show password"}
                    >
                      {showAdminPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                {adminLoginError && (
                  <div className="mb-4 p-2 sm:p-3 bg-red-900 border-2 border-red-500 rounded-lg shadow-sm">
                    <p className="text-xs sm:text-sm text-red-300 font-medium">{adminLoginError}</p>
                  </div>
                )}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setLoginMode('user');
                      setAdminUsername("");
                      setAdminPassword("");
                      setAdminLoginError("");
                    }}
                    className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-slate-600 text-gray-200 font-semibold rounded-lg hover:bg-slate-500 transition-all shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdminLoading}
                    className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdminLoading ? 'Logging in...' : 'Admin Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Login History Modal */}
      {showLoginHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[200] flex items-center justify-center p-4">
          <div className="bg-blue-800 rounded-lg shadow-2xl max-w-4xl w-full mx-4 sm:mx-auto p-4 sm:p-6 relative z-[201] border-2 border-yellow-500 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-yellow-400">
                Login History
              </h2>
              <button
                onClick={() => {
                  setShowLoginHistory(false);
                  setLoginHistory([]);
                  setHistoryError("");
                }}
                className="text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-8">
                <p className="text-yellow-400">Loading login history...</p>
              </div>
            ) : historyError ? (
              <div className="mb-4 p-3 bg-red-900 border-2 border-red-500 rounded-lg">
                <p className="text-sm text-red-300">{historyError}</p>
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300">No login history found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-yellow-500">
                      <th className="text-left py-2 px-2 text-yellow-400">Username</th>
                      <th className="text-left py-2 px-2 text-yellow-400">Email</th>
                      <th className="text-left py-2 px-2 text-yellow-400">Role</th>
                      <th className="text-left py-2 px-2 text-yellow-400">Login Time</th>
                      <th className="text-left py-2 px-2 text-yellow-400">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((login) => (
                      <tr key={login.id} className="border-b border-slate-600 hover:bg-slate-700">
                        <td className="py-2 px-2 text-white">{login.username}</td>
                        <td className="py-2 px-2 text-white">{login.email}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            login.role === 'admin' 
                              ? 'bg-yellow-500 text-slate-900' 
                              : 'bg-slate-600 text-white'
                          }`}>
                            {login.role}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-white">
                          {new Date(login.loginAt).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-gray-300 text-xs">{login.ipAddress || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowLoginHistory(false);
                  setLoginHistory([]);
                  setHistoryError("");
                }}
                className="px-4 py-2 bg-slate-600 text-gray-200 font-semibold rounded-lg hover:bg-slate-500 transition-all shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <HeroTitleSection />
      <MainHero />
      <ImageSection
        selectedImage={selectedImage}
        isAdmin={isAdmin}
        onImageUpload={handleImageUpload}
        onRemoveImage={handleRemoveImage}
      />
      
      <RiskFactorsSection />

      {/* Modules Dropdown - Opens below Modules button */}
      {(isUserLoggedIn || isAdmin) && (
        <>
          {/* Overlay */}
          {isModulesPanelOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-30 z-[90] transition-opacity duration-300"
              onClick={() => setIsModulesPanelOpen(false)}
            >        </div>
      )}

      {/* Modern Confirmation Modal */}
      {showConfirmModal && confirmModalData && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-slideUp border-2 border-yellow-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">{confirmModalData.title}</h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6">
              <p className="text-gray-700 text-base leading-relaxed mb-6">
                {confirmModalData.message}
              </p>

              {/* Warning Icon */}
              <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg mb-6">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-800 font-medium">
                  This action cannot be undone. Please make sure you want to proceed.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmModalData(null);
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModalData.onConfirm();
                    setConfirmModalData(null);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Panel */}
          <div className={`fixed top-[80px] sm:top-[100px] right-0 left-0 sm:left-auto w-full sm:w-[500px] sm:max-w-[90vw] h-[calc(100vh-80px)] sm:h-[580px] bg-blue-800 shadow-2xl z-[110] transform transition-all duration-300 ease-in-out overflow-hidden rounded-lg sm:rounded-l-lg border-2 border-yellow-500 ${
            isModulesPanelOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[-10px] scale-95 pointer-events-none'
          }`}>
            {/* Panel Header */}
            <div className="sticky top-0 bg-blue-900 border-b-2 border-yellow-500 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between z-10 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-yellow-400">Interactive E-Modules</h2>
              <button
                onClick={() => setIsModulesPanelOpen(false)}
                className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors text-gray-300 hover:text-yellow-400"
                aria-label="Close panel"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
        </div>

            {/* Panel Content */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 pb-10 sm:pb-12 overflow-y-auto h-[calc(100vh-140px)] sm:h-[calc(600px-60px)]">
              <p className="text-black mb-4 text-xs sm:text-sm leading-relaxed bg-white/90 backdrop-blur-sm p-2 sm:p-3 rounded-lg border-2 border-yellow-500 shadow-sm font-medium">
              Eight comprehensive modules designed for adolescents aged 12-18 combining evidence-based content with purpose-specific for natural relevance.
            </p>

          {/* Add Module Button - Only for Admin */}
          {isAdmin && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={handleAddModule}
                    className="px-3 sm:px-4 py-2 bg-yellow-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:bg-yellow-400 border-2 border-yellow-400 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 sm:gap-2"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Module
              </button>
            </div>
          )}

          {/* Editable Modules */}
              <div id="modules-section">
          {modules.map((module) => {
            const colorClasses = getColorClasses(module.color);
            const isEditing = editingModule === module.id;
            const isJustSavedModule =
              lastSavedItem?.moduleId === module.id &&
              (lastSavedItem?.type === "module" || lastSavedItem?.type === "module-add" || lastSavedItem?.type === "video");
            
            return (
              <Fragment key={module.id}>
                <div
                  className={`relative bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-2 mb-3 hover:border-yellow-500 ${
                    isJustSavedModule ? "ring-2 ring-green-500 border-green-500 shadow-green-500/20" : "border-blue-700"
                  }`}
                >
                <div className="p-2 sm:p-3 flex items-start gap-2 sm:gap-3">
                  {isJustSavedModule && (
                    <span className="absolute top-2 right-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shadow-sm">
                      Saved
                    </span>
                  )}
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 ${colorClasses.bg.replace('500', '100')} rounded-lg flex items-center justify-center border ${colorClasses.border.replace('300', '200')}`}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={colorClasses.bg.replace('bg-', 'text-').replace('500', '600')}
                    >
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {module.title}
                      </h3>
                      {isAdmin && !isEditing && (
                        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEditModule(module)}
                            className="text-slate-700 hover:text-slate-800 transition-colors p-1 hover:bg-slate-400 rounded touch-manipulation"
                            title="Edit module"
                          >
                            <svg
                              width="14"
                              height="14"
                              className="sm:w-4 sm:h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveModule(module.id)}
                            className="text-slate-700 hover:text-red-500 transition-colors p-1 hover:bg-slate-400 rounded touch-manipulation"
                            title="Remove module"
                          >
                            <svg
                              width="14"
                              height="14"
                              className="sm:w-4 sm:h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-800 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border-2 border-yellow-500 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white text-gray-800"
                            placeholder="Enter module title"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-800 mb-1">
                            Description
                          </label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="w-full px-2 py-1.5 text-sm border-2 border-yellow-500 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none bg-white text-gray-800"
                            placeholder="Enter module description"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveModule(module.id)}
                            className="px-3 py-1.5 text-sm bg-yellow-500 text-slate-900 font-semibold rounded hover:bg-yellow-400 transition-all shadow-md"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 text-sm bg-slate-400 text-gray-800 font-semibold rounded hover:bg-slate-500 transition-all shadow-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-700 mb-2 text-xs sm:text-sm leading-relaxed line-clamp-2 font-medium">
                          {module.description}
                        </p>
                      </>
                    )}

                    {/* View Details Button - For all modules */}
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setModuleDetailsOpen(prev => ({
                            ...prev,
                            [module.id]: !prev[module.id]
                          }));
                          if (moduleDetailsOpen[module.id]) {
                            setModuleView(prev => ({
                              ...prev,
                              [module.id]: null
                            }));
                          }
                        }}
                        className="text-orange-600 hover:text-orange-700 font-semibold text-xs flex items-center gap-1 transition-colors px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded border border-orange-100"
                      >
                        {moduleDetailsOpen[module.id] ? "Hide" : "Details"}
                        <svg
                          className={`w-3 h-3 transition-transform duration-200 ${
                            moduleDetailsOpen[module.id] ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Two Buttons - Shown when View Details is clicked for this module */}
              {moduleDetailsOpen[module.id] && (
                <>
                  <div className="grid grid-cols-1 gap-2 mb-3">
                    {/* Module Videos Button */}
                    <button
                      onClick={() => setModuleView(prev => ({
                        ...prev,
                        [module.id]: prev[module.id] === "videos" ? null : "videos"
                      }))}
                      className={`p-2 ${colorClasses.bg === "bg-pink-500" ? "bg-pink-50" : colorClasses.bg === "bg-blue-500" ? "bg-blue-50" : colorClasses.bg === "bg-green-500" ? "bg-green-50" : colorClasses.bg === "bg-purple-500" ? "bg-purple-50" : colorClasses.bg === "bg-orange-500" ? "bg-orange-50" : colorClasses.bg === "bg-indigo-500" ? "bg-indigo-50" : colorClasses.bg === "bg-teal-500" ? "bg-teal-50" : "bg-red-50"} border ${colorClasses.border} rounded hover:shadow-md transition-all duration-200 text-left`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${colorClasses.bg.replace('500', '100')} rounded flex items-center justify-center flex-shrink-0 border ${colorClasses.border.replace('300', '200')}`}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={colorClasses.bg.replace('bg-', 'text-').replace('500', '600')}
                          >
                            <path
                              d="M8 5v14l11-7z"
                              fill="currentColor"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">Videos</h4>
                        </div>
                      </div>
                    </button>

                    {/* Pre-Post Questions Button */}
                    <button
                      onClick={() => setModuleView(prev => ({
                        ...prev,
                        [module.id]: prev[module.id] === "questions" ? null : "questions"
                      }))}
                      className="p-2 bg-green-50 border border-green-200 rounded hover:border-green-300 hover:shadow-md transition-all duration-200 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0 border border-green-200">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-green-600"
                          >
                            <path
                              d="M9 11H1l4-4m0 0l4 4m-4-4v12"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                            <path
                              d="M15 13h8l-4 4m0 0l-4-4m4 4V5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">Questions</h4>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Module Videos Section - Shown when Videos button is clicked */}
                  {moduleView[module.id] === "videos" && (() => {
                    const moduleVideos = videos[module.id] || { english: [], punjabi: [], hindi: [], activity: [] };
                    const currentVideoType = selectedVideoType[module.id];
                    
                    return (
                      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-gray-900">Videos</h3>
                          {currentVideoType && (
                            <button
                              onClick={() => setSelectedVideoType(prev => ({ ...prev, [module.id]: null }))}
                              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                              </svg>
                              Back to Categories
                            </button>
                          )}
                        </div>

                        {/* 4 Language/Activity Buttons */}
                        {!currentVideoType && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* English Button */}
                            <button
                              onClick={() => setSelectedVideoType(prev => ({ ...prev, [module.id]: "english" }))}
                              className="p-6 bg-blue-50 border-2 border-blue-300 rounded-lg hover:border-blue-400 hover:shadow-lg transition-all duration-200 text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold text-lg">EN</span>
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900 mb-1">English</h4>
                                  <p className="text-sm text-gray-600">{moduleVideos.english.length} / 1 video</p>
                                </div>
                              </div>
                            </button>

                            {/* Punjabi Button */}
                            <button
                              onClick={() => setSelectedVideoType(prev => ({ ...prev, [module.id]: "punjabi" }))}
                              className="p-6 bg-orange-50 border-2 border-orange-300 rounded-lg hover:border-orange-400 hover:shadow-lg transition-all duration-200 text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold text-lg">PA</span>
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900 mb-1">Punjabi</h4>
                                  <p className="text-sm text-gray-600">{moduleVideos.punjabi.length} / 1 video</p>
                                </div>
                              </div>
                            </button>

                            {/* Hindi Button */}
                            <button
                              onClick={() => setSelectedVideoType(prev => ({ ...prev, [module.id]: "hindi" }))}
                              className="p-6 bg-green-50 border-2 border-green-300 rounded-lg hover:border-green-400 hover:shadow-lg transition-all duration-200 text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold text-lg">HI</span>
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900 mb-1">Hindi</h4>
                                  <p className="text-sm text-gray-600">{moduleVideos.hindi.length} / 1 video</p>
                                </div>
                              </div>
                            </button>

                            {/* Activity Video Button */}
                            <button
                              onClick={() => setSelectedVideoType(prev => ({ ...prev, [module.id]: "activity" }))}
                              className="p-6 bg-purple-50 border-2 border-purple-300 rounded-lg hover:border-purple-400 hover:shadow-lg transition-all duration-200 text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                                    <path d="M14.751 9c.906 0 1.15.756 1.15 1.089v5.912c0 .333-.244 1.089-1.15 1.089H9.249c-.906 0-1.15-.756-1.15-1.089v-5.912c0-.333.244-1.089 1.15-1.089h5.502z" fill="currentColor"/>
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900 mb-1">Activity Video</h4>
                                  <p className="text-sm text-gray-600">{moduleVideos.activity.length} / 1 video</p>
                                </div>
                              </div>
                            </button>
                          </div>
                        )}

                        {/* Video Upload Area - Shown when a type is selected */}
                        {currentVideoType && (() => {
                          const savedVideoList = moduleVideos[currentVideoType] || [];
                          const pendingVideoList = pendingVideos[module.id]?.[currentVideoType] || null;
                          const hasSavedVideo = savedVideoList.length > 0;
                          const hasPendingVideo = pendingVideoList && pendingVideoList.length > 0;
                          const displayVideo = hasSavedVideo ? savedVideoList : (hasPendingVideo ? pendingVideoList : null);
                          const progressKey = `${module.id}-${currentVideoType}`;
                          const currentProgress = uploadProgress[progressKey];
                          
                          return (
                            <>
                              <div className="mb-6">
                                <h4 className="text-xl font-bold text-gray-900 mb-2 capitalize">
                                  {currentVideoType === "activity" ? "Activity" : currentVideoType} Videos
                                </h4>
                                <div className="flex items-center justify-between mb-4">
                                  <p className="text-sm text-gray-600">
                                    {isAdmin 
                                      ? `Upload videos for ${currentVideoType === "activity" ? "activities" : `the ${currentVideoType} language`}`
                                      : `View ${currentVideoType === "activity" ? "activity" : currentVideoType} videos`
                                    }
                                  </p>
                                  <span className="text-sm text-gray-500">
                                    {hasSavedVideo ? "1 / 1 video saved" : hasPendingVideo ? "Pending save" : "No video"}
                                  </span>
                                </div>
                              </div>

                              {/* Video Upload Area - Only for Admin */}
                              {isAdmin && !hasSavedVideo && !hasPendingVideo && (
                                <div className="mb-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload Video <span className="text-red-500">*</span>
                                  </label>
                                  <label
                                    htmlFor={`video-upload-${module.id}-${currentVideoType}`}
                                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                  >
                                    <input
                                      id={`video-upload-${module.id}-${currentVideoType}`}
                                      type="file"
                                      accept="video/*"
                                      onChange={(e) => handleVideoUpload(e, module.id)}
                                      className="hidden"
                                    />
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                      <svg
                                        className="w-12 h-12 mb-4 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                      </svg>
                                      <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                      </p>
                                      <p className="text-xs text-gray-500">MP4, AVI, MOV (MAX. 5GB each)</p>
                                    </div>
                                  </label>
                                  
                                  {/* Upload Progress Bar - Shows during upload */}
                                  {currentProgress && (
                                    <div className="mt-4">
                                      <UploadProgressBar
                                        progress={currentProgress.progress}
                                        message={currentProgress.message}
                                        stage={currentProgress.stage}
                                        originalSize={currentProgress.originalSize}
                                        compressedSize={currentProgress.compressedSize}
                                        uploadedBytes={currentProgress.uploadedBytes}
                                        totalBytes={currentProgress.totalBytes}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Pending Video Display with Save Button - Only for Admin */}
                              {isAdmin && hasPendingVideo && !hasSavedVideo && displayVideo && displayVideo.length > 0 && (() => {
                                const pendingVideo = displayVideo[0];
                                
                                // Only use Cloudinary secure_url - never use blob URLs
                                // Blob URLs cause ERR_FILE_NOT_FOUND errors
                                const pendingVideoSrc = pendingVideo.fileUrl || null;
                                const pendingVideoPoster = pendingVideo.preview && 
                                  !pendingVideo.preview.includes('/video/upload/') && 
                                  pendingVideo.preview.startsWith('https://') ? pendingVideo.preview : undefined;
                                
                                console.log('[Video Display] Pending video:', {
                                  hasFileUrl: !!pendingVideo.fileUrl,
                                  fileUrl: pendingVideo.fileUrl,
                                  preview: pendingVideo.preview,
                                  videoSrc: pendingVideoSrc,
                                  poster: pendingVideoPoster,
                                });
                                
                                return (
                                  <div className="relative mb-6">
                                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
                                      <p className="text-sm text-green-800 font-medium mb-1">
                                        ✅ Video uploaded successfully!
                                      </p>
                                      <p className="text-xs text-green-700">
                                        Preview your video below. Click &quot;Save Video&quot; to make it available to all users.
                                      </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                      <div className="relative mb-3">
                                        {pendingVideoSrc ? (
                                          <VideoPlayer
                                            url={pendingVideoSrc}
                                            poster={pendingVideoPoster}
                                            className="rounded-lg border border-gray-300"
                                            onError={(error) => {
                                              console.error('[Video Display] Pending video playback error:', error);
                                            }}
                                          />
                                        ) : (
                                          <div className="relative aspect-video bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                                            <div className="text-center p-4">
                                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                                              <p className="text-gray-500 text-sm">Processing video...</p>
                                              <p className="text-gray-400 text-xs mt-1">Video URL will be available shortly</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-3 bg-white rounded-lg">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">
                                          {currentVideoType === "activity" ? "Activity" : currentVideoType.charAt(0).toUpperCase() + currentVideoType.slice(1)} Video (Preview)
                                        </p>
                                        <p className="text-xs text-gray-600 truncate" title={pendingVideo.fileName}>
                                          📹 {pendingVideo.fileName}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          📦 Size: {(pendingVideo.fileSize / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        {!pendingVideoSrc && (
                                          <p className="text-xs text-yellow-600 mt-2">
                                            ⚠️ Video URL is being processed. Please wait...
                                          </p>
                                        )}
                                        <div className="mt-4 flex gap-3">
                                          <button
                                            onClick={() => handleSaveVideo(module.id)}
                                            className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
                                          >
                                            Save Video
                                          </button>
                                          <button
                                            onClick={() => handleCancelPendingVideo(module.id)}
                                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Saved Video Display - Visible to all users */}
                              {hasSavedVideo && displayVideo && displayVideo.length > 0 && (() => {
                                const video = displayVideo[0];
                                
                                // Try to get video URL from fileUrl, or construct from preview if it's a Cloudinary thumbnail
                                let videoSrc = video.fileUrl || null;
                                
                                // If fileUrl is missing but preview is a Cloudinary thumbnail, extract public_id and construct video URL
                                if (!videoSrc && video.preview && video.preview.includes('res.cloudinary.com')) {
                                  // Extract public_id from thumbnail URL
                                  // Format: https://res.cloudinary.com/{cloud_name}/video/upload/w_640,h_360,c_fill/{public_id}.jpg
                                  const publicIdMatch = video.preview.match(/\/video\/upload\/[^\/]*\/([^\/\.]+)/);
                                  if (publicIdMatch) {
                                    const publicId = publicIdMatch[1];
                                    const cloudName = video.preview.match(/res\.cloudinary\.com\/([^\/]+)/)?.[1] || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'adohealth';
                                    // Construct video URL with transformations
                                    videoSrc = `https://res.cloudinary.com/${cloudName}/video/upload/f_mp4,f_auto,q_auto/${publicId}`;
                                    console.log('[Video Display] Constructed video URL from preview:', {
                                      preview: video.preview,
                                      publicId,
                                      constructedUrl: videoSrc,
                                    });
                                  }
                                }
                                
                                // Use preview as poster/thumbnail only if it's a Cloudinary image URL
                                const videoPoster = video.preview && 
                                  video.preview.startsWith('https://res.cloudinary.com') && 
                                  !video.preview.includes('/video/upload/') ? video.preview : undefined;
                                
                                // Log video data for debugging
                                console.log('[Video Display] Saved video:', { 
                                  hasFileUrl: !!video.fileUrl, 
                                  fileUrl: video.fileUrl, 
                                  preview: video.preview, 
                                  videoSrc,
                                  videoPoster,
                                  fileName: video.fileName,
                                });
                                
                                if (!videoSrc) {
                                  return (
                                    <div className="relative">
                                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                        <div className="p-6 text-center">
                                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-blue-800 font-medium mb-2">
                                              📹 Video metadata found
                                            </p>
                                            <p className="text-xs text-blue-600 mb-2">
                                              File: {video.fileName}
                                            </p>
                                            <p className="text-xs text-blue-600">
                                              Size: {(video.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-2">
                                            Video was saved but video URL is not available.
                                          </p>
                                          {video.preview && video.preview.includes('res.cloudinary.com') ? (
                                            <p className="text-xs text-blue-600 mb-4">
                                              Attempting to load video from Cloudinary...
                                            </p>
                                          ) : (
                                            <p className="text-xs text-gray-500 mb-4">
                                              {isAdmin ? 'Please remove and re-upload the video to view it.' : 'Please contact an administrator.'}
                                            </p>
                                          )}
                                          {isAdmin && (
                                            <div className="flex gap-2 justify-center">
                                              <button
                                                onClick={async () => {
                                                  // Try to refresh the video data
                                                  console.log('[Video Display] Refreshing video data for module:', module.id);
                                                  await refetchData();
                                                }}
                                                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                                              >
                                                Refresh
                                              </button>
                                              <button
                                                onClick={() => handleRemoveVideo(module.id, video.id)}
                                                className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                                              >
                                                Remove Video
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="relative">
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                      <div className="relative mb-3">
                                        <VideoPlayer
                                          url={videoSrc}
                                          poster={videoPoster}
                                          className="rounded-lg border border-gray-300"
                                          onError={(error) => {
                                            console.error('Video player error:', error);
                                            if (process.env.NODE_ENV === 'development') {
                                              console.error('Video data:', { video, videoSrc, videoPoster });
                                            }
                                          }}
                                        />
                                        {isAdmin && (
                                          <button
                                            onClick={() => handleRemoveVideo(module.id, video.id)}
                                            className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-lg text-sm font-medium z-20"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                      <div className="p-3 bg-white rounded-lg">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">
                                          {currentVideoType === "activity" ? "Activity" : currentVideoType.charAt(0).toUpperCase() + currentVideoType.slice(1)} Video
                                        </p>
                                        <p className="text-xs text-gray-600 truncate">
                                          {video.fileName}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {(video.fileSize / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* No Video Message */}
                              {!hasSavedVideo && !hasPendingVideo && (
                                <div className="text-center py-12 text-gray-500">
                                  <p>{isAdmin ? "No videos uploaded yet. Click the upload area above to add videos." : "No videos available yet."}</p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Module Questions Form - Shown when Pre-Post Questions button is clicked */}
                  {moduleView[module.id] === "questions" && (
                    <form className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-3" onSubmit={(e) => handleSubmitAnswers(e, module.id)}>
                      <div className="space-y-3">
                        {(moduleQuestions[module.id] || []).map((q) => {
                          const isEditing = editingQuestion?.moduleId === module.id && editingQuestion?.questionId === q.id;
                          const isJustSavedQuestion =
                            lastSavedItem?.type === "question" &&
                            lastSavedItem.moduleId === module.id &&
                            lastSavedItem.questionId === q.id;
                          
                          return (
                            <fieldset
                              key={q.id}
                              className={`border rounded-lg p-4 hover:border-pink-300 transition-colors relative ${
                                isJustSavedQuestion ? "ring-2 ring-green-500 border-green-500 bg-green-50/50" : "border-gray-200"
                              }`}
                            >
                              {isJustSavedQuestion && (
                                <span className="absolute top-4 right-4 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shadow-sm">
                                  Saved
                                </span>
                              )}
                              {isAdmin && !isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleEditQuestion(module.id, q)}
                                  className={`absolute top-4 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 ${isJustSavedQuestion ? "right-20" : "right-4"}`}
                                  title="Edit Question"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              
                              <legend className="px-3 text-sm font-bold text-gray-900">
                                Question {q.id} <span className="text-red-500">*</span>
                              </legend>
                              
                              {isEditing ? (
                                <div className="mt-4 space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Question Text
                                    </label>
                                    <textarea
                                      value={editQuestionText}
                                      onChange={(e) => setEditQuestionText(e.target.value)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                      rows={3}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Answer Options
                                    </label>
                                    <div className="space-y-2">
                                      {editQuestionOptions.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                          <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleEditQuestionOption(index, e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder={`Option ${index + 1}`}
                                          />
                                          {editQuestionOptions.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveQuestionOption(index)}
                                              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-all duration-200 text-sm font-medium"
                                            >
                                              Remove
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={handleAddQuestionOption}
                                        className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-all duration-200 text-sm font-medium"
                                      >
                                        Add Option
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Correct Answer <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                      Select which option is the correct answer for this question
                                    </p>
                                    <div className="space-y-2">
                                      {editQuestionOptions.map((option, index) => (
                                        <label
                                          key={index}
                                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                            editCorrectAnswer === index
                                              ? 'border-green-500 bg-green-50'
                                              : 'border-gray-200 hover:border-gray-300'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`correct-answer-${editingQuestion?.moduleId}-${editingQuestion?.questionId}`}
                                            checked={editCorrectAnswer === index}
                                            onChange={() => setEditCorrectAnswer(index)}
                                            className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2 cursor-pointer"
                                          />
                                          <span className="text-gray-700 font-medium text-sm flex-1">
                                            Option {index + 1}: {option || `(Empty option ${index + 1})`}
                                          </span>
                                          {editCorrectAnswer === index && (
                                            <span className="text-green-600 font-semibold text-sm">✓ Correct</span>
                                          )}
                                        </label>
                                      ))}
                                      {editQuestionOptions.length === 0 && (
                                        <p className="text-sm text-gray-500 italic">
                                          Please add at least one option before selecting the correct answer.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-3 pt-2">
                                    <button
                                      type="button"
                                      onClick={handleSaveQuestion}
                                      className="px-6 py-2.5 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 border border-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                      Save Question
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditQuestion}
                                      className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-200 transition-all duration-200"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="mt-4 mb-6">
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                      {q.question}
                                    </label>
                                    <p className="text-xs text-gray-500">
                                      Please select one answer from the options below
                                    </p>
                                  </div>

                                  {/* Radio Options */}
                                  <div className="space-y-3">
                                    {q.options.map((option, index) => (
                                      <label
                                        key={index}
                                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-pink-400 hover:bg-pink-50 cursor-pointer transition-all duration-200"
                                      >
                                        <input
                                          type="radio"
                                          name={`question-${q.id}`}
                                          value={option}
                                          required
                                          defaultChecked={savedAnswers[module.id]?.[q.id] === option}
                                          className="w-5 h-5 text-pink-600 border-gray-300 focus:ring-pink-500 focus:ring-2 cursor-pointer"
                                        />
                                        <span className="text-gray-700 font-medium text-sm flex-1">{option}</span>
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
                            </fieldset>
                          );
                        })}
                      </div>

                      {/* Form Actions */}
                      <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <p className="text-sm text-gray-500">
                          <span className="text-red-500">*</span> Required fields
                          {savedAnswers[module.id] && Object.keys(savedAnswers[module.id]).length > 0 && (
                            <span className="ml-2 text-green-600 font-medium">• Answers saved - you can edit and resubmit</span>
                          )}
                        </p>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              const form = document.querySelector('form');
                              if (form) {
                                form.reset();
                              }
                              // Clear saved answers for this module (local state only)
                              const updatedAnswers = { ...savedAnswers };
                              delete updatedAnswers[module.id];
                              setSavedAnswers(updatedAnswers);
                              // Note: Answers are stored in the database via API, 
                              // clearing form only clears local state for UI purposes
                            }}
                            className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-200 transition-all duration-200"
                          >
                            Clear Form
                          </button>
                          <button
                            type="submit"
                            className="px-8 py-3 bg-green-50 text-green-600 font-semibold rounded-lg hover:bg-green-100 border border-green-200 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            {savedAnswers[module.id] && Object.keys(savedAnswers[module.id]).length > 0 ? 'Update & Resubmit' : 'Submit Answers'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </>
              )}
              </Fragment>
            );
          })}
        </div>
            </div>
          </div>
        </>
      )}

      <Footer />
    </main>
  );
}
