"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  getModules,
  createModule,
  updateModule,
  deleteModule,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAnswers,
  submitAnswer,
  getVideos,
  createVideo,
  deleteVideo,
  type ModuleData,
  type QuestionData,
  type AnswerData,
  type VideoData,
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
import VideoUploader from "./components/VideoUploader";
import { UploadProgress } from "../lib/cloudinary-direct-upload";
import {
  storeVideo,
  uploadVideoInBackground,
  processPendingUploads,
  getPendingUploads,
  type StoredVideo,
} from "../lib/video-storage";

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
    options: [
      "A. Tuberculosis",
      "B. Heart disease",
      "C. Cholera",
      "D. Hepatitis",
    ],
    correctAnswer: 1, // B. Heart disease
  },
  {
    id: 2,
    question:
      "Which of the following is one of the BIG 7 risk factors that causes NCDs?",
    options: [
      "A. Drinking water",
      "B. Unhealthy diet",
      "C. Brushing teeth",
      "D. Washing hands",
    ],
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
    options: [
      "A. Asthma",
      "B. Oral cancer",
      "C. Osteoarthritis",
      "D. Migraine",
    ],
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
    options: [
      "A. Epilepsy",
      "B. Obesity",
      "C. Glaucoma",
      "D. Parkinson's disease",
    ],
    correctAnswer: 1, // B. Obesity
  },
  {
    id: 8,
    question: "Excessive sedentary screen time increases risk of:",
    options: [
      "A. Kidney stones",
      "B. Obesity",
      "C. Thyroid disorders",
      "D. Varicose veins",
    ],
    correctAnswer: 1, // B. Obesity
  },
  {
    id: 9,
    question: "Poor sleep increases risk of:",
    options: [
      "A. Scoliosis",
      "B. Diabetes",
      "C. Psoriasis",
      "D. Osteoarthritis",
    ],
    correctAnswer: 1, // B. Diabetes
  },
  {
    id: 10,
    question: "Which lifestyle choice helps prevent NCDs?",
    options: [
      "A. Skipping meals",
      "B. Regular exercise",
      "C. Excessive gaming",
      "D. Midnight snacking",
    ],
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
  const [actionLoading, setActionLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // User login state
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

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

  // Admin save success/error/info message (shown after save)
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
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
      document.body.style.overflow = "hidden";
    } else {
      // Re-enable scroll on body
      document.body.style.overflow = "";
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModulesPanelOpen]);

  // Disable body scroll when confirmation modal is open
  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showConfirmModal]);

  // Disable body scroll when login history modal is open
  useEffect(() => {
    if (showLoginHistory) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showLoginHistory]);

  // Handle Escape key to close confirmation modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showConfirmModal) {
        setShowConfirmModal(false);
        setConfirmModalData(null);
      }
    };

    if (showConfirmModal) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showConfirmModal]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Ensure we start in loading mode
      setIsAuthLoading(true);
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setIsUserLoggedIn(true);
            setUserName(data.user.username);
            setUserEmail(data.user.email || "");
            setUserRole(data.user.role);
            setIsAdmin(data.user.role === "admin");
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        // CRITICAL: Only set to false once the API call is completely finished
        setIsAuthLoading(false);
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
          console.log(
            `Found ${pending.length} pending upload(s), processing in background...`,
          );
          // Process uploads in background
          processPendingUploads((videoId, progress) => {
            // Update progress for any pending uploads
            const video = pending.find((v) => v.id === videoId);
            if (video) {
              const progressKey = `${video.moduleId}-${video.videoType}`;
              setUploadProgress((prev) => ({
                ...prev,
                [progressKey]: progress,
              }));
            }
          });
        }
      } catch (error) {
        console.error("Error processing pending uploads:", error);
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
        const apiModules: Module[] = modulesResponse.data.modules.map((m) => ({
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
            const apiAnswers: {
              [moduleId: number]: { [questionId: number]: string };
            } = {};
            answersResponse.data.answers.forEach((a: any) => {
              if (!apiAnswers[a.moduleId]) {
                apiAnswers[a.moduleId] = {};
              }
              apiAnswers[a.moduleId][a.questionId] = a.answer;
            });
            setSavedAnswers(apiAnswers);
          }
        } catch (error) {
          console.debug("Could not load answers:", error);
        }
      }

      if (isUserLoggedIn || isAdmin) {
        try {
          const videosResponse = await getVideos();
          if (videosResponse.success && videosResponse.data?.videos) {
            const apiVideos: {
              [moduleId: number]: {
                english: Array<{
                  id: number;
                  preview: string;
                  fileName: string;
                  fileSize: number;
                  fileUrl?: string;
                }>;
                punjabi: Array<{
                  id: number;
                  preview: string;
                  fileName: string;
                  fileSize: number;
                  fileUrl?: string;
                }>;
                hindi: Array<{
                  id: number;
                  preview: string;
                  fileName: string;
                  fileSize: number;
                  fileUrl?: string;
                }>;
                activity: Array<{
                  id: number;
                  preview: string;
                  fileName: string;
                  fileSize: number;
                  fileUrl?: string;
                }>;
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
          console.debug("Could not load videos:", error);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        !errorMessage.includes("Authentication") &&
        !errorMessage.includes("Database")
      ) {
        console.error("Error loading data from APIs:", error);
      }
      setModules(defaultModules);
    }
  }, [isUserLoggedIn, isAdmin]);

  // Load data on mount and when auth changes; also load image/heading from localStorage
  useEffect(() => {
    const storedImage = localStorage.getItem("adminUploadedImage");
    if (storedImage) setSelectedImage(storedImage);
    const storedLoginHeading = localStorage.getItem("adminLoginHeading");
    if (storedLoginHeading) setLoginHeading(storedLoginHeading);
    refetchData();
  }, [refetchData]);

  // Show save feedback toast (success, error, or info) and optionally highlight the saved item
  const showSaveFeedback = useCallback(
    (
      type: "success" | "error" | "info",
      text: string,
      savedItem?: {
        type: "module" | "question" | "video" | "module-add";
        moduleId: number;
        questionId?: number;
      } | null,
    ) => {
      setSaveMessage({ type, text });
      if (savedItem) setLastSavedItem(savedItem);
      const t = setTimeout(() => {
        setSaveMessage(null);
        setLastSavedItem(null);
      }, 4000);
      return () => clearTimeout(t);
    },
    [],
  );

  const [showUserLogin, setShowUserLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<"user" | "admin">("user");
  const [userPopupView, setUserPopupView] = useState<"login" | "create">(
    "login",
  );
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
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] =
    useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminLoading(true);
    setAdminLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.user.role === "admin") {
          setIsAdmin(true);
          setIsUserLoggedIn(true);
          setUserName(data.user.username);
          setUserEmail(data.user.email || "");
          setUserRole(data.user.role);
          setShowAdminLogin(false);
          setAdminUsername("");
          setAdminPassword("");
          setAdminLoginError("");
        } else {
          setAdminLoginError("This account is not an admin account.");
        }
      } else {
        setAdminLoginError(
          data.message ||
            data.error ||
            "Invalid credentials. Please try again.",
        );
        setAdminPassword("");
      }
    } catch (error) {
      console.error("Login error:", error);
      setAdminLoginError("An error occurred during login. Please try again.");
      setAdminPassword("");
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: loginPassword }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsUserLoggedIn(true);
        setUserName(data.user.username || data.user.email);
        setUserEmail(data.user.email || "");
        setUserRole(data.user.role);
        setIsAdmin(data.user.role === "admin");
        setShowUserLogin(false);
        setLoginEmail("");
        setLoginPassword("");
        setLoginError("");
      } else {
        setLoginError(
          data.message || data.error || "Login failed. Please try again.",
        );
      }
    } catch (error) {
      console.error("User login error:", error);
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

    // 2. Complexity Rules (Regex)
    // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(createPassword)) {
      setCreateError(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&).",
      );
      setIsCreateLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: createPassword }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsUserLoggedIn(true);
        setUserName(data.user.username || data.user.email);
        setUserEmail(data.user.email || "");
        setUserRole(data.user.role);
        setIsAdmin(data.user.role === "admin");
        setShowUserLogin(false);
        setCreateEmail("");
        setCreatePassword("");
        setCreateConfirmPassword("");
        setCreateError("");
      } else {
        setCreateError(
          data.message ||
            data.error ||
            "Could not create account. Email may already be registered.",
        );
      }
    } catch (error) {
      console.error("Create account error:", error);
      setCreateError("An error occurred. Please try again.");
    } finally {
      setIsCreateLoading(false);
    }
  };

  const handleUserLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
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
      const response = await fetch("/api/auth/login-history?limit=100");
      const data = await response.json();

      if (response.ok && data.success) {
        setLoginHistory(data.data.logins || []);
      } else {
        setHistoryError(
          data.message || data.error || "Failed to load login history",
        );
      }
    } catch (error) {
      console.error("Error fetching login history:", error);
      setHistoryError("An error occurred while loading login history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  // State for module details - track which modules have details open
  const [moduleDetailsOpen, setModuleDetailsOpen] = useState<{
    [key: number]: boolean;
  }>({});
  const [moduleView, setModuleView] = useState<{
    [key: number]: "videos" | "questions" | "questions_pre" | "questions_post" | null;
  }>({});
  const [selectedVideoType, setSelectedVideoType] = useState<{
    [key: number]: "english" | "punjabi" | "hindi" | "activity" | null;
  }>({});

  // Reload videos when a video type is selected to ensure fresh data
  useEffect(() => {
    const reloadVideosForModule = async (moduleId: number) => {
      try {
        const videosResponse = await getVideos(moduleId);
        if (videosResponse.success && videosResponse.data?.videos) {
          const moduleVideos: {
            english: Array<{
              id: number;
              preview: string;
              fileName: string;
              fileSize: number;
              fileUrl?: string;
            }>;
            punjabi: Array<{
              id: number;
              preview: string;
              fileName: string;
              fileSize: number;
              fileUrl?: string;
            }>;
            hindi: Array<{
              id: number;
              preview: string;
              fileName: string;
              fileSize: number;
              fileUrl?: string;
            }>;
            activity: Array<{
              id: number;
              preview: string;
              fileName: string;
              fileSize: number;
              fileUrl?: string;
            }>;
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

          setVideos((prev) => ({
            ...prev,
            [moduleId]: moduleVideos,
          }));
        }
      } catch (error) {
        console.error("Error reloading videos for module:", error);
      }
    };

    // Reload videos for any module that has a selected video type
    Object.keys(selectedVideoType).forEach((moduleIdStr) => {
      const moduleId = Number(moduleIdStr);
      if (selectedVideoType[moduleId]) {
        reloadVideosForModule(moduleId);
      }
    });
  }, [selectedVideoType]);

  // Videos state for all modules - initialize empty to avoid hydration errors
  const [videos, setVideos] = useState<{
    [moduleId: number]: {
      english: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
      }>;
      punjabi: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
      }>;
      hindi: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
      }>;
      activity: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
      }>;
    };
  }>({});

  // Pending videos - uploaded but not yet saved (only visible to admin)
  const [pendingVideos, setPendingVideos] = useState<{
    [moduleId: number]: {
      english: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
        publicId?: string;
      }> | null;
      punjabi: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
        publicId?: string;
      }> | null;
      hindi: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
        publicId?: string;
      }> | null;
      activity: Array<{
        id: number;
        preview: string;
        fileName: string;
        fileSize: number;
        fileUrl?: string;
        publicId?: string;
      }> | null;
    };
  }>({});

  // State for 8 editable modules - use defaults initially
  const defaultModules: Module[] = [
    {
      id: 1,
      title: "Introduction to NCDs+",
      description:
        "Understanding Non-Communicable Diseases and their impact on adolescent health. This module covers the basics of NCDs, the Big-7 risk factors, and how to identify and prevent these diseases.",
      color: "pink",
    },
    {
      id: 2,
      title: "Module 2 Title",
      description:
        "Module 2 description. Click to edit this text and customize the content for your module.",
      color: "blue",
    },
    {
      id: 3,
      title: "Module 3 Title",
      description:
        "Module 3 description. Click to edit this text and customize the content for your module.",
      color: "green",
    },
    {
      id: 4,
      title: "Module 4 Title",
      description:
        "Module 4 description. Click to edit this text and customize the content for your module.",
      color: "purple",
    },
    {
      id: 5,
      title: "Module 5 Title",
      description:
        "Module 5 description. Click to edit this text and customize the content for your module.",
      color: "orange",
    },
    {
      id: 6,
      title: "Module 6 Title",
      description:
        "Module 6 description. Click to edit this text and customize the content for your module.",
      color: "indigo",
    },
    {
      id: 7,
      title: "Module 7 Title",
      description:
        "Module 7 description. Click to edit this text and customize the content for your module.",
      color: "teal",
    },
    {
      id: 8,
      title: "Module 8 Title",
      description:
        "Module 8 description. Click to edit this text and customize the content for your module.",
      color: "red",
    },
  ];

  const [modules, setModules] = useState<Module[]>(defaultModules);

  // Questions state - per module
  const [moduleQuestions, setModuleQuestions] = useState<{
    [moduleId: number]: Question[];
  }>(() => {
    // Initialize with default questions for existing modules
    const initial: { [moduleId: number]: Question[] } = {};
    defaultModules.forEach((module) => {
      initial[module.id] = defaultQuestions.map((q) => ({ ...q }));
    });
    return initial;
  });

  // Question editing state
  const [editingQuestion, setEditingQuestion] = useState<{
    moduleId: number;
    questionId: number;
  } | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionOptions, setEditQuestionOptions] = useState<string[]>([]);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState<
    number | undefined
  >(undefined);

  // Saved answers state - to allow editing submitted answers
  const [savedAnswers, setSavedAnswers] = useState<{
    [moduleId: number]: { [questionId: number]: string };
  }>({});

  const [editingModule, setEditingModule] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Login heading editable state
  const [isEditingLoginHeading, setIsEditingLoginHeading] =
    useState<boolean>(false);

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
        showSaveFeedback("success", "Module updated successfully.", {
          type: "module",
          moduleId,
        });
      } else {
        showSaveFeedback("error", response.error || "Failed to update module");
      }
    } catch (error) {
      console.error("Error saving module:", error);
      showSaveFeedback(
        "error",
        "An error occurred while saving the module. Please try again.",
      );
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
    setEditCorrectAnswer(
      question.correctAnswer !== undefined ? question.correctAnswer : undefined,
    );
  };

  const handleSaveQuestion = async () => {
    if (!isAdmin || !editingQuestion) return;

    // Validation
    if (!editQuestionText.trim()) {
      alert("Please enter a question text.");
      return;
    }

    if (editQuestionOptions.length < 2) {
      alert("Please add at least 2 answer options.");
      return;
    }

    if (editQuestionOptions.some((opt) => !opt.trim())) {
      alert("Please fill in all answer options.");
      return;
    }

    if (editCorrectAnswer === undefined || editCorrectAnswer === null) {
      alert("Please select the correct answer for this question.");
      return;
    }

    const { moduleId, questionId } = editingQuestion;
    setActionLoading(true); // Start loading
    try {
      const response = await updateQuestion(questionId, moduleId, {
        question: editQuestionText.trim(),
        options: editQuestionOptions.map((opt) => opt.trim()),
        correctAnswer: editCorrectAnswer,
      });

      if (response.success && response.data?.question) {
        const updatedQuestion = response.data.question;
        const updatedQuestions = (moduleQuestions[moduleId] || []).map((q) =>
          q.id === questionId
            ? {
                id: updatedQuestion.id,
                question: updatedQuestion.question,
                options: updatedQuestion.options,
                correctAnswer: updatedQuestion.correctAnswer,
              }
            : q,
        );

        const updatedModuleQuestions = {
          ...moduleQuestions,
          [moduleId]: updatedQuestions,
        };

        setModuleQuestions(updatedModuleQuestions);
        await refetchData();
        showSaveFeedback("success", "Question updated successfully.", {
          type: "question",
          moduleId,
          questionId,
        });
      } else {
        showSaveFeedback(
          "error",
          response.error || "Failed to update question",
        );
      }
    } catch (error) {
      console.error("Error saving question:", error);
      showSaveFeedback(
        "error",
        "An error occurred while saving the question. Please try again.",
      );
    } finally {
      setActionLoading(false); // Stop loading regardless of success or fail
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

    const newModuleId = Math.max(...modules.map((m) => m.id), 0) + 1;
    const colors = [
      "pink",
      "blue",
      "green",
      "purple",
      "orange",
      "indigo",
      "teal",
      "red",
    ];
    const newColor = colors[(newModuleId - 1) % colors.length];

    const newModuleData: ModuleData = {
      id: newModuleId,
      title: `Module ${newModuleId} Title`,
      description: `Module ${newModuleId} description. Click to edit this text and customize the content for your module.`,
      color: newColor,
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
        const questionsToCreate = defaultQuestions.map((q) => ({
          id: q.id,
          moduleId: newModuleId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
        }));

        const questionPromises = questionsToCreate.map((q) =>
          createQuestion(q),
        );
        const questionResults = await Promise.all(questionPromises);

        // Initialize questions in state
        const createdQuestions: Question[] = questionResults
          .filter((r) => r.success && r.data?.question)
          .map((r) => ({
            id: r.data!.question.id,
            question: r.data!.question.question,
            options: r.data!.question.options,
            correctAnswer: r.data!.question.correctAnswer,
          }));

        const updatedQuestions = {
          ...moduleQuestions,
          [newModuleId]:
            createdQuestions.length > 0
              ? createdQuestions
              : defaultQuestions.map((q) => ({ ...q })),
        };
        setModuleQuestions(updatedQuestions);

        // Initialize videos for new module
        const updatedVideos = {
          ...videos,
          [newModuleId]: {
            english: [],
            punjabi: [],
            hindi: [],
            activity: [],
          },
        };
        setVideos(updatedVideos);

        await refetchData();
        showSaveFeedback("success", "Module created successfully.", {
          type: "module-add",
          moduleId: createdModule.id,
        });
      } else {
        showSaveFeedback(
          "error",
          moduleResponse.error || "Failed to create module",
        );
      }
    } catch (error) {
      console.error("Error creating new module:", error);
      showSaveFeedback(
        "error",
        "An error occurred while creating the module. Please try again.",
      );
    }
  };

  // Remove module function
  const handleRemoveModule = async (moduleId: number) => {
    if (!isAdmin) return;

    // Show custom confirmation modal
    setConfirmModalData({
      title: "Delete Module",
      message:
        "Are you sure you want to remove this module? This will also delete all associated questions and videos. This action cannot be undone.",
      onConfirm: async () => {
        setShowConfirmModal(false);
        await performModuleDeletion(moduleId);
      },
    });
    setShowConfirmModal(true);
  };

  // Perform actual module deletion
  const performModuleDeletion = async (moduleId: number) => {
    setActionLoading(true);
    try {
      // Delete module via API (this will cascade delete questions and videos if configured)
      const response = await deleteModule(moduleId);

      if (response.success) {
        // Remove module from modules array
        const updatedModules = modules.filter((m) => m.id !== moduleId);
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
        showSaveFeedback("success", "Module deleted successfully.");
      } else {
        showSaveFeedback("error", response.error || "Failed to delete module");
      }
    } catch (error) {
      console.error("Error deleting module:", error);
      showSaveFeedback(
        "error",
        "An error occurred while deleting the module. Please try again.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: {
      [key: string]: { bg: string; border: string; hover: string };
    } = {
      pink: {
        bg: "bg-pink-500",
        border: "border-pink-300",
        hover: "hover:border-pink-400",
      },
      blue: {
        bg: "bg-blue-500",
        border: "border-blue-300",
        hover: "hover:border-blue-400",
      },
      green: {
        bg: "bg-green-500",
        border: "border-green-300",
        hover: "hover:border-green-400",
      },
      purple: {
        bg: "bg-purple-500",
        border: "border-purple-300",
        hover: "hover:border-purple-400",
      },
      orange: {
        bg: "bg-orange-500",
        border: "border-orange-300",
        hover: "hover:border-orange-400",
      },
      indigo: {
        bg: "bg-indigo-500",
        border: "border-indigo-300",
        hover: "hover:border-indigo-400",
      },
      teal: {
        bg: "bg-teal-500",
        border: "border-teal-300",
        hover: "hover:border-teal-400",
      },
      red: {
        bg: "bg-red-500",
        border: "border-red-300",
        hover: "hover:border-red-400",
      },
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
        alert(
          `Image file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 2MB. Please compress the image and try again.`,
        );
        return;
      }

      // Create preview URL and save to localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setSelectedImage(imageData);
        // Save to localStorage so all users can see it
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("adminUploadedImage", imageData);
          } catch (error: any) {
            if (error.name === "QuotaExceededError") {
              alert(
                "Storage limit reached. The image is displayed but may not persist after page refresh. Please remove some content or use a smaller image.",
              );
            } else {
              console.error("Error saving image:", error);
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminUploadedImage");
    }
  };

  // Upload progress state - tracks progress for each module/videoType combination
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: UploadProgress;
  }>({});

  const handleVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    moduleId: number,
  ) => {
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
      alert(
        `You can only upload 1 video for ${videoType}. Please remove or save the existing video first.`,
      );
      return;
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      alert(`${file.name} is not a video file. Please select a video file.`);
      return;
    }

    // Validate file size (5GB max)
    const maxVideoSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxVideoSize) {
      alert(
        `Video file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5GB.`,
      );
      return;
    }

    // Warn about large files
    const largeFileThreshold = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > largeFileThreshold) {
      const proceed = confirm(
        `Video file is large (${(file.size / 1024 / 1024).toFixed(2)}MB). Large videos will be compressed automatically. Continue?`,
      );
      if (!proceed) return;
    }

    // Initialize upload progress key
    const progressKey = `${moduleId}-${videoType}`;
    let startTime = performance.now();

    try {
      const uploadWithProgress = () => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append("file", file);
          formData.append("moduleId", String(moduleId));
          formData.append("videoType", videoType);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const now = performance.now();
              const durationInSeconds = (now - startTime) / 1000;
              const percentComplete = Math.round(
                (event.loaded / event.total) * 100,
              );

              // Calculate Speed
              const bps = event.loaded / durationInSeconds;
              const mbps = (bps / (1024 * 1024)).toFixed(2);

              setUploadProgress((prev) => ({
                ...prev,
                [progressKey]: {
                  stage: "uploading",
                  progress: percentComplete,
                  message:
                    percentComplete < 100
                      ? `Uploading at ${mbps} MB/s`
                      : "Processing...",
                  originalSize: file.size,
                  uploadedBytes: event.loaded,
                  totalBytes: event.total,
                  speed: `${mbps} MB/s`,
                },
              }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error."));
          xhr.open("POST", "/api/cloudinary-upload");
          xhr.withCredentials = true;
          xhr.send(formData);
        });
      };

      const data: any = await uploadWithProgress();

      const {
        fileUrl,
        previewUrl,
        fileName: savedFileName,
        fileSize: savedFileSize,
        videoId,
      } = data;

      setPendingVideos((prev) => ({
        ...prev,
        [moduleId]: {
          ...(prev[moduleId] || {
            english: null,
            punjabi: null,
            hindi: null,
            activity: null,
          }),
          [videoType]: [
            {
              id: videoId,
              preview: previewUrl || "/images/video-placeholder.svg",
              fileName: savedFileName || file.name,
              fileSize: savedFileSize ?? file.size,
              fileUrl,
            },
          ],
        },
      }));

      showSaveFeedback(
        "success",
        'Video uploaded! Click "Save Video" to finalize.',
        { type: "video", moduleId },
      );
    } catch (error: any) {
      console.error("Error uploading video:", error);

      let errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("401"))
        errorMessage = "Authentication failed. Log in again.";
      else if (errorMessage.includes("403"))
        errorMessage = "Access denied. Admin required.";
      else if (errorMessage.includes("Network"))
        errorMessage = "Network error. Check connection.";

      showSaveFeedback("error", `Failed to upload video: ${errorMessage}`, {
        type: "video",
        moduleId,
      });
    } finally {
      // Cleanup progress state and reset input
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[progressKey];
        return next;
      });
      event.target.value = "";
    }
  };

  const handleSaveVideo = async (moduleId: number) => {
    if (!isAdmin) return; // Only admin can save videos

    const videoType = selectedVideoType[moduleId];
    if (!videoType) return;

    const pendingVideo = pendingVideos[moduleId]?.[videoType];
    if (!pendingVideo || pendingVideo.length === 0) return;

    const videoToSave = pendingVideo[0];

    // Validate that required fields are present
    if (!videoToSave.fileName || videoToSave.fileSize === undefined) {
      showSaveFeedback(
        "error",
        "Video upload is not complete. Please wait for the upload to finish before saving.",
      );
      return;
    }

    try {
      // Use videoId from pending (set by local upload) or compute next
      const existingVideos = videos[moduleId]?.[videoType] || [];
      const nextVideoId =
        typeof videoToSave.id === "number" && Number.isInteger(videoToSave.id)
          ? videoToSave.id
          : existingVideos.length > 0
            ? Math.max(...existingVideos.map((v) => v.id)) + 1
            : 1;

      // Preview: use existing, or Cloudinary thumbnail, or placeholder for local fileUrl
      let preview = videoToSave.preview;
      if (!preview || preview === "") {
        if (videoToSave.publicId) {
          const { getVideoThumbnail } = await import("@/lib/cloudinary");
          preview = getVideoThumbnail(videoToSave.publicId);
        } else if (videoToSave.fileUrl) {
          if (videoToSave.fileUrl.startsWith("/")) {
            preview = "/images/video-placeholder.svg";
          } else {
            const urlMatch = videoToSave.fileUrl.match(
              /\/v\d+\/(.+?)(?:\.[^.]+)?$/,
            );
            if (urlMatch) {
              const { getVideoThumbnail } = await import("@/lib/cloudinary");
              preview = getVideoThumbnail(urlMatch[1]);
            } else {
              preview = videoToSave.fileUrl;
            }
          }
        } else {
          showSaveFeedback(
            "error",
            "Video preview is not available. Please wait for the upload to complete.",
          );
          return;
        }
      }

      const videoData: VideoData & { publicId?: string } = {
        moduleId,
        videoType: videoType as "english" | "punjabi" | "hindi" | "activity",
        videoId: nextVideoId,
        preview,
        fileName: videoToSave.fileName,
        fileSize: videoToSave.fileSize,
        fileUrl: videoToSave.fileUrl || "",
        publicId: videoToSave.publicId,
      };

      const response = await createVideo(videoData);

      if (response.success && response.data?.video) {
        const createdVideo = response.data.video;

        // Update videos state - include fileUrl for playback
        const updatedVideos = {
          ...videos,
          [moduleId]: {
            ...(videos[moduleId] || {
              english: [],
              punjabi: [],
              hindi: [],
              activity: [],
            }),
            [videoType]: [
              ...(videos[moduleId]?.[videoType] || []),
              {
                id: createdVideo.videoId,
                preview: createdVideo.preview,
                fileName: createdVideo.fileName,
                fileSize: createdVideo.fileSize,
                fileUrl: createdVideo.fileUrl || videoToSave.fileUrl, // Include fileUrl for playback
              },
            ],
          },
        };
        setVideos(updatedVideos);

        // Clear pending video
        setPendingVideos((prev) => ({
          ...prev,
          [moduleId]: {
            ...(prev[moduleId] || {
              english: null,
              punjabi: null,
              hindi: null,
              activity: null,
            }),
            [videoType]: null,
          },
        }));

        await refetchData();
        showSaveFeedback(
          "success",
          "Video saved successfully. All users can now view this video.",
          { type: "video", moduleId },
        );
      } else {
        showSaveFeedback("error", response.error || "Failed to save video");
      }
    } catch (error: any) {
      console.error("Error saving video:", error);
      showSaveFeedback(
        "error",
        "Error saving video: " +
          (error.message || "Unknown error") +
          ". Please try again.",
      );
    }
  };

  const handleDirectUploadSuccess = async (
    moduleId: number,
    videoType: string,
    url: string,
    publicId: string,
    bytes: number,
  ) => {
    try {
      const videoData: VideoData = {
        moduleId,
        videoType: videoType as "english" | "punjabi" | "hindi" | "activity",
        videoId: Date.now(), // Unique ID
        preview: url.replace(/\.[^/.]+$/, ".jpg"), // Auto-generated thumbnail
        fileName: `Video_${moduleId}_${videoType}`,
        fileSize: bytes,
        fileUrl: url,
      };

      const response = await createVideo(videoData);

      if (response.success) {
        await refetchData(); // Refresh UI to show the new video
        showSaveFeedback("success", "Video saved successfully!", {
          type: "video",
          moduleId,
        });
      }
    } catch (error) {
      showSaveFeedback(
        "error",
        "Upload successful but failed to save to database.",
      );
    }
  };

  const handleRemoveVideo = (moduleId: number, id: number) => {
    if (!isAdmin) return;

    const videoType = selectedVideoType[moduleId];
    if (!videoType) return;

    // Trigger the existing confirmation modal logic
    setConfirmModalData({
      title: "Remove Video",
      message: `Are you sure you want to remove the ${videoType} video? This will permanently delete the video record from the database.`,
      onConfirm: async () => {
        setShowConfirmModal(false); // Close modal immediately
        await performVideoDeletion(moduleId, id, videoType); // Execute actual deletion
      },
    });

    setShowConfirmModal(true);
  };

  // Helper function to handle the actual API call and state update
  const performVideoDeletion = async (
    moduleId: number,
    id: number,
    videoType: string,
  ) => {
    setActionLoading(true);
    try {
      // Delete video via API
      const response = await deleteVideo(id, moduleId, videoType);

      if (response.success) {
        // Update local videos state
        const updatedVideos = {
          ...videos,
          [moduleId]: {
            ...videos[moduleId],
            [videoType]: videos[moduleId][videoType].filter(
              (video) => video.id !== id,
            ),
          },
        };
        setVideos(updatedVideos);

        // Refresh data from server to ensure sync
        await refetchData();
        showSaveFeedback("success", "Video deleted successfully.", {
          type: "video",
          moduleId,
        });
      } else {
        showSaveFeedback("error", response.error || "Failed to delete video");
      }
    } catch (error: any) {
      console.error("Error removing video:", error);
      showSaveFeedback(
        "error",
        "An error occurred while deleting the video. Please try again.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPendingVideo = (moduleId: number) => {
    if (!isAdmin) return; // Only admin can cancel pending videos

    const videoType = selectedVideoType[moduleId];
    if (!videoType) return;

    setPendingVideos((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {
          english: null,
          punjabi: null,
          hindi: null,
          activity: null,
        }),
        [videoType]: null,
      },
    }));
  };

  const handleSubmitAnswers = async (
    event: React.FormEvent<HTMLFormElement>,
    moduleId: number,
  ) => {
    event.preventDefault();
    setActionLoading(true); // Disable the button immediately

    // Collect all form answers
    const formData = new FormData(event.currentTarget);
    const emailAnswers: { [key: string]: string } = {};
    const answersToSave: { [questionId: number]: string } = {};
    const answersArray: Array<{ questionId: number; answer: string }> = [];

    const questions = moduleQuestions[moduleId] || [];

    // 1. Gather all answers in one pass
    questions.forEach((q) => {
      const answer = formData.get(`question-${q.id}`);
      if (answer) {
        const answerStr = answer as string;
        emailAnswers[`Question ${q.id}`] = answerStr;
        answersToSave[q.id] = answerStr;
        answersArray.push({
          questionId: q.id,
          answer: answerStr,
        });
      }
    });

    if (answersArray.length === 0) {
      alert("Please answer at least one question before submitting.");
      setActionLoading(false);
      return;
    }

    // 2. Format answers for email
    const selectedModule = modules.find((m) => m.id === moduleId);
    const emailSubject = `${selectedModule?.title || `Module ${moduleId}`} Pre-Post Questions Answers`;
    let emailBody = `${selectedModule?.title || `Module ${moduleId}`} Pre-Post Questions - Answers\n\n`;

    Object.entries(emailAnswers).forEach(([question, answer]) => {
      emailBody += `${question}: ${answer}\n`;
    });

    emailBody += "\n\nSubmitted via AdoHealth Initiative Website";

    try {
      // 3. Save answers to API using ONE bulk request
      let saveOk = false;
      try {
        const response = await fetch("/api/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            answers: answersArray,
          }),
        });

        const result = await response.json();
        saveOk = !!result.success;

        if (saveOk) {
          // Update local state so UI shows "Update & Resubmit"
          setSavedAnswers((prev) => ({ ...prev, [moduleId]: answersToSave }));
        }
      } catch (err) {
        console.error("Error saving bulk answers to API:", err);
      }

      if (!saveOk) {
        alert("Failed to save answers to the database. Please try again.");
        return;
      }

      // 4. Then try to send email (optional; answers already saved for admin)
      let emailSent = false;
      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "adohealthicmr2025@gmail.com",
            subject: emailSubject,
            body: emailBody,
            answers: emailAnswers,
          }),
        });
        const data = await response.json().catch(() => ({}));
        emailSent = !!data.success && data.emailSent !== false;
      } catch (err) {
        console.warn("Email send failed:", err);
      }

      if (emailSent) {
        alert(
          "Your answers have been saved and are visible in the admin Users section. A copy was sent to adohealthicmr2025@gmail.com.",
        );
      } else {
        alert(
          "Your answers have been saved and are visible in the admin Users section. (Email notification could not be sent.)",
        );
      }
    } catch (error) {
      console.error("Error submitting answers:", error);
      alert(
        "An error occurred while submitting your answers. Please try again.",
      );
    } finally {
      setActionLoading(false); // Re-enable the button once finished
    }
  };

  return (
    <main className="min-h-screen bg-blue-700">
      {/* Admin save feedback toast */}
      {saveMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-lg shadow-lg text-white font-medium max-w-md text-center ${
            saveMessage.type === "success"
              ? "bg-green-600"
              : saveMessage.type === "error"
                ? "bg-red-600"
                : "bg-blue-600"
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
        isLoading={isAuthLoading}
        onLoginClick={() => {
          setShowUserLogin(true);
          setLoginMode("user");
        }}
        onAdminLoginClick={() => {
          setShowUserLogin(true);
          setLoginMode("admin");
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
                      if (typeof window !== "undefined") {
                        localStorage.setItem("adminLoginHeading", loginHeading);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingLoginHeading(false);
                        if (typeof window !== "undefined") {
                          localStorage.setItem(
                            "adminLoginHeading",
                            loginHeading,
                          );
                        }
                      }
                      if (e.key === "Escape") {
                        setIsEditingLoginHeading(false);
                        const stored =
                          localStorage.getItem("adminLoginHeading");
                        setLoginHeading(stored || "Login");
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
                  style={{ cursor: isAdmin ? "pointer" : "default" }}
                  title={isAdmin ? "Double-click to edit" : ""}
                >
                  {loginHeading}
                </h2>
              )}
              <button
                onClick={() => {
                  setShowUserLogin(false);
                  setLoginMode("user");
                  setUserPopupView("login");
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
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
                    setLoginMode("user");
                    setUserPopupView("login");
                    setLoginEmail("");
                    setLoginPassword("");
                    setCreateEmail("");
                    setCreatePassword("");
                    setCreateConfirmPassword("");
                    setAdminPassword("");
                    setAdminLoginError("");
                  }}
                  className={`flex-1 px-3 sm:px-4 py-2 rounded-md font-semibold text-xs sm:text-sm transition-colors ${
                    loginMode === "user"
                      ? "bg-yellow-500 text-slate-900 shadow-lg"
                      : "text-gray-300 hover:text-yellow-400 hover:bg-slate-600"
                  }`}
                >
                  User Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("admin");
                    setUserPopupView("login");
                    setLoginEmail("");
                    setLoginPassword("");
                    setCreateEmail("");
                    setCreatePassword("");
                    setCreateConfirmPassword("");
                    setLoginError("");
                  }}
                  className={`flex-1 px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                    loginMode === "admin"
                      ? "bg-yellow-500 text-slate-900 shadow-lg"
                      : "text-gray-300 hover:text-yellow-400 hover:bg-slate-600"
                  }`}
                >
                  Admin Login
                </button>
              </div>
            </div>

            {/* User: Login or Create account view */}
            {loginMode === "user" && userPopupView === "login" && (
              <form onSubmit={handleUserLogin}>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setLoginError("");
                    }}
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
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginError("");
                      }}
                      className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      aria-label={
                        showLoginPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showLoginPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {loginError && (
                  <div className="mb-4 p-2 sm:p-3 bg-red-900 border-2 border-red-500 rounded-lg shadow-sm">
                    <p className="text-xs sm:text-sm text-red-300 font-medium">
                      {loginError}
                    </p>
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
                    {isLoginLoading ? "Logging in..." : "Login"}
                  </button>
                </div>
                <p className="text-center text-xs sm:text-sm text-gray-400">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setUserPopupView("create");
                      setLoginError("");
                    }}
                    className="text-yellow-400 hover:text-yellow-300 font-medium underline"
                  >
                    Create account
                  </button>
                </p>
              </form>
            )}

            {/* Create account form: email, set password, confirm password, Create button */}
            {loginMode === "user" && userPopupView === "create" && (
              <form onSubmit={handleCreateAccount}>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-yellow-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => {
                      setCreateEmail(e.target.value);
                      setCreateError("");
                    }}
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
                      onChange={(e) => {
                        setCreatePassword(e.target.value);
                        setCreateError("");
                      }}
                      className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                      placeholder="Set your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      aria-label={
                        showCreatePassword ? "Hide password" : "Show password"
                      }
                    >
                      {showCreatePassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
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
                      onChange={(e) => {
                        setCreateConfirmPassword(e.target.value);
                        setCreateError("");
                      }}
                      className="w-full px-3 sm:px-4 py-2 pr-10 text-sm sm:text-base border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-slate-700 text-white"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreateConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      aria-label={
                        showCreateConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showCreateConfirmPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {createError && (
                  <div className="mb-4 p-2 sm:p-3 bg-red-900 border-2 border-red-500 rounded-lg shadow-sm">
                    <p className="text-xs sm:text-sm text-red-300 font-medium">
                      {createError}
                    </p>
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
                    {isCreateLoading ? "Creating..." : "Create"}
                  </button>
                </div>
                <p className="text-center text-xs sm:text-sm text-gray-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setUserPopupView("login");
                      setCreateError("");
                    }}
                    className="text-yellow-400 hover:text-yellow-300 font-medium underline"
                  >
                    Login
                  </button>
                </p>
              </form>
            )}

            {/* Admin Login Form */}
            {loginMode === "admin" && (
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
                      aria-label={
                        showAdminPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showAdminPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {adminLoginError && (
                  <div className="mb-4 p-2 sm:p-3 bg-red-900 border-2 border-red-500 rounded-lg shadow-sm">
                    <p className="text-xs sm:text-sm text-red-300 font-medium">
                      {adminLoginError}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setLoginMode("user");
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
                    {isAdminLoading ? "Logging in..." : "Admin Login"}
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
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
                      <th className="text-left py-2 px-2 text-yellow-400">
                        Username
                      </th>
                      <th className="text-left py-2 px-2 text-yellow-400">
                        Email
                      </th>
                      <th className="text-left py-2 px-2 text-yellow-400">
                        Role
                      </th>
                      <th className="text-left py-2 px-2 text-yellow-400">
                        Login Time
                      </th>
                      <th className="text-left py-2 px-2 text-yellow-400">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((login) => (
                      <tr
                        key={login.id}
                        className="border-b border-slate-600 hover:bg-slate-700"
                      >
                        <td className="py-2 px-2 text-white">
                          {login.username}
                        </td>
                        <td className="py-2 px-2 text-white">{login.email}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              login.role === "admin"
                                ? "bg-yellow-500 text-slate-900"
                                : "bg-slate-600 text-white"
                            }`}
                          >
                            {login.role}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-white">
                          {new Date(login.loginAt).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-gray-300 text-xs">
                          {login.ipAddress || "N/A"}
                        </td>
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
            >
              {" "}
            </div>
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
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {confirmModalData.title}
                  </h3>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-6">
                  <p className="text-gray-700 text-base leading-relaxed mb-6">
                    {confirmModalData.message}
                  </p>

                  {/* Warning Icon */}
                  <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg mb-6">
                    <svg
                      className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <p className="text-sm text-red-800 font-medium">
                      This action cannot be undone. Please make sure you want to
                      proceed.
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
          <div
            className={`fixed top-[60px] sm:top-[80px] right-0 left-0 sm:left-auto w-full sm:w-[500px] sm:max-w-[90vw] h-[calc(100vh-80px)] sm:h-[580px] bg-blue-800 shadow-2xl z-[110] transform transition-all duration-300 ease-in-out overflow-hidden rounded-lg sm:rounded-l-lg border-2 border-yellow-500 ${
              isModulesPanelOpen
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-[-10px] scale-95 pointer-events-none"
            }`}
          >
            {/* Panel Header */}
            <div className="sticky top-0 bg-blue-900 border-b-2 border-yellow-500 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between z-10 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-yellow-400">
                Interactive E-Modules
              </h2>
              <button
                onClick={() => setIsModulesPanelOpen(false)}
                className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors text-gray-300 hover:text-yellow-400"
                aria-label="Close panel"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 pb-10 sm:pb-12 overflow-y-auto h-[calc(100vh-140px)] sm:h-[calc(600px-60px)]">
              <p className="text-black mb-4 text-xs sm:text-sm leading-relaxed bg-white/90 backdrop-blur-sm p-2 sm:p-3 rounded-lg border-2 border-yellow-500 shadow-sm font-medium">
                Eight comprehensive modules designed for adolescents aged 12-18
                combining evidence-based content with purpose-specific for
                natural relevance.
              </p>

              {/* Add Module Button - Only for Admin */}
              {isAdmin && (
                <div className="mb-4 flex justify-center">
                  <button
                    onClick={handleAddModule}
                    className="px-3 sm:px-4 py-2 bg-yellow-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:bg-yellow-400 border-2 border-yellow-400 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 sm:gap-2"
                  >
                    <svg
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
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
                    (lastSavedItem?.type === "module" ||
                      lastSavedItem?.type === "module-add" ||
                      lastSavedItem?.type === "video");

                  return (
                    <Fragment key={module.id}>
                      {/* MAIN MODULE CARD */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          if (isEditing) return; // Prevent card click logic while editing
                          setModuleDetailsOpen((prev) => ({
                            ...prev,
                            [module.id]: !prev[module.id],
                          }));
                          if (moduleDetailsOpen[module.id]) {
                            setModuleView((prev) => ({
                              ...prev,
                              [module.id]: null,
                            }));
                          }
                        }}
                        className={`relative w-full text-left bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-2 mb-3 hover:border-yellow-500 ${!isEditing ? "cursor-pointer" : "cursor-default"} ${
                          isJustSavedModule
                            ? "ring-2 ring-green-500 border-green-500 shadow-green-500/20"
                            : "border-blue-700"
                        }`}
                      >
                        <div className="p-2 sm:p-3 flex items-start gap-2 sm:gap-3 w-full">
                          {isJustSavedModule && (
                            <span className="absolute top-2 right-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shadow-sm">
                              Saved
                            </span>
                          )}
                          {/* Icon */}
                          <div
                            className={`flex-shrink-0 w-10 h-10 ${colorClasses.bg.replace("500", "100")} rounded-lg flex items-center justify-center border ${colorClasses.border.replace("300", "200")}`}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className={colorClasses.bg
                                .replace("bg-", "text-")
                                .replace("500", "600")}
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
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditModule(module);
                                    }}
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
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveModule(module.id);
                                    }}
                                    disabled={actionLoading}
                                    className={`transition-colors p-1 rounded touch-manipulation flex items-center justify-center ${
                                      actionLoading
                                        ? "text-slate-400 cursor-not-allowed bg-slate-200"
                                        : "text-slate-700 hover:text-red-500 hover:bg-slate-400"
                                    }`}
                                    title={
                                      actionLoading
                                        ? "Processing..."
                                        : "Remove module"
                                    }
                                  >
                                    {actionLoading ? (
                                      /* Small Spinner for Icon Button */
                                      <svg
                                        className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                          fill="none"
                                        />
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                      </svg>
                                    ) : (
                                      /* Your original Trash Icon */
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
                                        <line
                                          x1="10"
                                          y1="11"
                                          x2="10"
                                          y2="17"
                                        ></line>
                                        <line
                                          x1="14"
                                          y1="11"
                                          x2="14"
                                          y2="17"
                                        ></line>
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            {isEditing ? (
                              <div
                                className="space-y-2 mb-3 cursor-default"
                                onClick={(e) => e.stopPropagation()} // Prevent clicking inputs from toggling the card
                              >
                                <div>
                                  <label className="block text-xs font-medium text-slate-800 mb-1">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) =>
                                      setEditTitle(e.target.value)
                                    }
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
                                    onChange={(e) =>
                                      setEditDescription(e.target.value)
                                    }
                                    rows={3}
                                    className="w-full px-2 py-1.5 text-sm border-2 border-yellow-500 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none bg-white text-gray-800"
                                    placeholder="Enter module description"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveModule(module.id)}
                                    className="px-3 py-1.5 text-sm bg-yellow-500 text-slate-900 font-semibold rounded hover:bg-yellow-400 transition-all shadow-md"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
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
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModuleDetailsOpen((prev) => ({
                                    ...prev,
                                    [module.id]: !prev[module.id],
                                  }));
                                  if (moduleDetailsOpen[module.id]) {
                                    setModuleView((prev) => ({
                                      ...prev,
                                      [module.id]: null,
                                    }));
                                  }
                                }}
                                className="text-orange-600 hover:text-orange-700 font-semibold text-xs flex items-center gap-1 transition-colors px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded border border-orange-100"
                              >
                                <svg
                                  className={`w-3 h-3 transition-transform duration-200 ${
                                    moduleDetailsOpen[module.id]
                                      ? "rotate-180"
                                      : ""
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
                              onClick={() =>
                                setModuleView((prev) => ({
                                  ...prev,
                                  [module.id]:
                                    prev[module.id] === "videos"
                                      ? null
                                      : "videos",
                                }))
                              }
                              className={`w-full block p-2 ${colorClasses.bg === "bg-pink-500" ? "bg-pink-50" : colorClasses.bg === "bg-blue-500" ? "bg-blue-50" : colorClasses.bg === "bg-green-500" ? "bg-green-50" : colorClasses.bg === "bg-purple-500" ? "bg-purple-50" : colorClasses.bg === "bg-orange-500" ? "bg-orange-50" : colorClasses.bg === "bg-indigo-500" ? "bg-indigo-50" : colorClasses.bg === "bg-teal-500" ? "bg-teal-50" : "bg-red-50"} border ${colorClasses.border} rounded hover:shadow-md transition-all duration-200 text-left`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div
                                    className={`w-8 h-8 ${colorClasses.bg.replace("500", "100")} rounded flex items-center justify-center flex-shrink-0 border ${colorClasses.border.replace("300", "200")}`}
                                  >
                                    <svg
                                      className={`w-4 h-4 ${colorClasses.bg.replace("bg-", "text-").replace("500", "600")}`}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M8 5v14l11-7z"
                                        fill="currentColor"
                                      />
                                    </svg>
                                  </div>
                                  <h4 className="text-xs font-bold text-gray-900 m-0 truncate">
                                    Videos
                                  </h4>
                                </div>

                                {/* Structural wrapper to FORCE the arrow to be visible */}
                                <span className="flex items-center justify-center w-6 h-6 min-w-[24px] shrink-0 ml-2">
                                  <svg
                                    className={`w-5 h-5 text-gray-700 transition-transform duration-200 ${moduleView[module.id] === "videos" ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </span>
                              </div>
                            </button>

                            {/* Pre-Post Questions Button */}
                            <button
                              onClick={() =>
                                setModuleView((prev) => ({
                                  ...prev,
                                  [module.id]:
                                    prev[module.id]?.startsWith("questions")
                                      ? null
                                      : "questions",
                                }))
                              }
                              className="w-full block p-2 bg-green-50 border border-green-200 rounded hover:border-green-300 hover:shadow-md transition-all duration-200 text-left"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0 border border-green-200">
                                    <svg
                                      className="w-4 h-4 text-green-600"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
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
                                  <h4 className="text-xs font-bold text-gray-900 m-0 truncate">
                                    Questions
                                  </h4>
                                </div>

                                {/* Structural wrapper to FORCE the arrow to be visible */}
                                <span className="flex items-center justify-center w-6 h-6 min-w-[24px] shrink-0 ml-2">
                                  <svg
                                    className={`w-5 h-5 text-green-700 transition-transform duration-200 ${moduleView[module.id]?.startsWith("questions") ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </span>
                              </div>
                            </button>
                          </div>

                          {/* Module Videos Section - Shown when Videos button is clicked */}
                          {moduleView[module.id] === "videos" &&
                            (() => {
                              const moduleVideos = videos[module.id] || {
                                english: [],
                                punjabi: [],
                                hindi: [],
                                activity: [],
                              };
                              const currentVideoType =
                                selectedVideoType[module.id];

                              return (
                                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-900">
                                      Videos
                                    </h3>
                                    {currentVideoType && (
                                      <button
                                        onClick={() =>
                                          setSelectedVideoType((prev) => ({
                                            ...prev,
                                            [module.id]: null,
                                          }))
                                        }
                                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                          />
                                        </svg>
                                        Back to Categories
                                      </button>
                                    )}
                                  </div>

                                  {/* Language Selection Grid */}
                                  {!currentVideoType && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      {(
                                        [
                                          "english",
                                          "punjabi",
                                          "hindi",
                                          "activity",
                                        ] as const
                                      ).map((type) => (
                                        <button
                                          key={type}
                                          onClick={() =>
                                            setSelectedVideoType((prev) => ({
                                              ...prev,
                                              [module.id]: type, 
                                            }))
                                          }
                                          className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-all text-left"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                                              <span className="text-white font-bold text-xs uppercase">
                                                {type.slice(0, 2)}
                                              </span>
                                            </div>
                                            <div>
                                              <h4 className="text-sm font-bold text-gray-900 capitalize">
                                                {type}
                                              </h4>
                                              <p className="text-[10px] text-gray-500">
                                                {moduleVideos[type]?.length >= 1
                                                  ? "1 / 1 Video"
                                                  : "No video"}
                                              </p>
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Video Content Area */}
                                  {currentVideoType &&
                                    (() => {
                                      const vType =
                                        currentVideoType as keyof typeof moduleVideos;
                                      // Check if a video is already saved in this specific category
                                      const savedVideo =
                                        moduleVideos[vType]?.[0];

                                      return (
                                        <div className="mt-2">
                                          <h4 className="text-sm font-bold text-gray-800 mb-3 capitalize">
                                            {currentVideoType} Category
                                          </h4>

                                          {savedVideo ? (
                                            /* ONE VIDEO LIMIT: If video exists, show Player and Remove Button */
                                            <div className="relative group border rounded-lg overflow-hidden">
                                              <VideoPlayer
                                                url={savedVideo.fileUrl}
                                                className="w-full aspect-video"
                                              />
                                              {isAdmin && (
                                                <button
                                                  onClick={() =>
                                                    handleRemoveVideo(
                                                      module.id,
                                                      savedVideo.id,
                                                    )
                                                  }
                                                  className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1.5 rounded shadow-lg text-[10px] font-bold hover:bg-red-700 transition-colors"
                                                >
                                                  ✕ Remove Video
                                                </button>
                                              )}
                                              <div className="p-2 bg-gray-50 border-t">
                                                <p className="text-[10px] text-gray-600 truncate">
                                                  File: {savedVideo.fileName}
                                                </p>
                                              </div>
                                            </div>
                                          ) : /* IF NO VIDEO: Only Admin sees the High-Speed Uploader */
                                          isAdmin ? (
                                            <div className="border-2 border-dashed border-blue-200 rounded-lg p-2 bg-slate-50">
                                              <VideoUploader
                                                moduleId={module.id}
                                                videoType={vType}
                                                onUploadSuccess={(
                                                  url,
                                                  pubId,
                                                  b,
                                                ) =>
                                                  handleDirectUploadSuccess(
                                                    module.id,
                                                    vType,
                                                    url,
                                                    pubId,
                                                    b,
                                                  )
                                                }
                                              />
                                              <p className="text-[10px] text-center text-gray-400 mt-2">
                                                Max 1 video per category. Direct
                                                upload enabled.
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                                              <p className="text-xs text-gray-400 italic">
                                                This video hasn't been uploaded
                                                yet.
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                </div>
                              );
                            })()}

                          {/* Module Questions Section - WITH PRE/POST OPTIONS */}
                          {moduleView[module.id]?.startsWith("questions") && (
                            moduleView[module.id] === "questions" ? (
                              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                  <button
                                    onClick={() => setModuleView(prev => ({ ...prev, [module.id]: "questions_pre" }))}
                                    className="p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:border-green-400 transition-all text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-xs uppercase">PR</span>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold text-gray-900">Pre Test</h4>
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => setModuleView(prev => ({ ...prev, [module.id]: "questions_post" }))}
                                    className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg hover:border-emerald-400 transition-all text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-emerald-500 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-xs uppercase">PO</span>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold text-gray-900">Post Test</h4>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <form
                                className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-3"
                                onSubmit={(e) =>
                                  handleSubmitAnswers(e, module.id)
                                }
                              >
                                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                  <h3 className="text-sm font-bold text-gray-900">
                                    {moduleView[module.id] === "questions_pre" ? "Pre Test" : "Post Test"}
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => setModuleView(prev => ({ ...prev, [module.id]: "questions" }))}
                                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to Options
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {(moduleQuestions[module.id] || []).map((q) => {
                                    const isEditing =
                                      editingQuestion?.moduleId === module.id &&
                                      editingQuestion?.questionId === q.id;
                                    const isJustSavedQuestion =
                                      lastSavedItem?.type === "question" &&
                                      lastSavedItem.moduleId === module.id &&
                                      lastSavedItem.questionId === q.id;

                                    return (
                                      <fieldset
                                        key={q.id}
                                        className={`border rounded-lg p-4 hover:border-pink-300 transition-colors relative ${
                                          isJustSavedQuestion
                                            ? "ring-2 ring-green-500 border-green-500 bg-green-50/50"
                                            : "border-gray-200"
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
                                            onClick={() =>
                                              handleEditQuestion(module.id, q)
                                            }
                                            className={`absolute top-4 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 ${isJustSavedQuestion ? "right-20" : "right-4"}`}
                                            title="Edit Question"
                                          >
                                            <svg
                                              className="w-5 h-5"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                              />
                                            </svg>
                                          </button>
                                        )}

                                        <legend className="px-3 text-sm font-bold text-gray-900">
                                          Question {q.id}{" "}
                                          <span className="text-red-500">*</span>
                                        </legend>

                                        {isEditing ? (
                                          <div className="mt-4 space-y-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Question Text
                                              </label>
                                              <textarea
                                                value={editQuestionText}
                                                onChange={(e) =>
                                                  setEditQuestionText(
                                                    e.target.value,
                                                  )
                                                }
                                                className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                rows={3}
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Answer Options
                                              </label>
                                              <div className="space-y-2">
                                                {editQuestionOptions.map(
                                                  (option, index) => (
                                                    <div
                                                      key={index}
                                                      className="flex gap-2"
                                                    >
                                                      <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) =>
                                                          handleEditQuestionOption(
                                                            index,
                                                            e.target.value,
                                                          )
                                                        }
                                                        className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                        placeholder={`Option ${index + 1}`}
                                                      />
                                                      {editQuestionOptions.length >
                                                        1 && (
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            handleRemoveQuestionOption(
                                                              index,
                                                            )
                                                          }
                                                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-all duration-200 text-sm font-medium"
                                                        >
                                                          Remove
                                                        </button>
                                                      )}
                                                    </div>
                                                  ),
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={
                                                    handleAddQuestionOption
                                                  }
                                                  className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-all duration-200 text-sm font-medium"
                                                >
                                                  Add Option
                                                </button>
                                              </div>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Correct Answer{" "}
                                                <span className="text-red-500">
                                                  *
                                                </span>
                                              </label>
                                              <p className="text-xs text-gray-500 mb-3">
                                                Select which option is the correct
                                                answer for this question
                                              </p>
                                              <div className="space-y-2">
                                                {editQuestionOptions.map(
                                                  (option, index) => (
                                                    <label
                                                      key={index}
                                                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                                        editCorrectAnswer ===
                                                        index
                                                          ? "border-green-500 bg-green-50"
                                                          : "border-gray-200 hover:border-gray-300"
                                                      }`}
                                                    >
                                                      <input
                                                        type="radio"
                                                        name={`correct-answer-${editingQuestion?.moduleId}-${editingQuestion?.questionId}`}
                                                        checked={
                                                          editCorrectAnswer ===
                                                          index
                                                        }
                                                        onChange={() =>
                                                          setEditCorrectAnswer(
                                                            index,
                                                          )
                                                        }
                                                        className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2 cursor-pointer"
                                                      />
                                                      <span className="text-gray-700 font-medium text-sm flex-1">
                                                        Option {index + 1}:{" "}
                                                        {option ||
                                                          `(Empty option ${index + 1})`}
                                                      </span>
                                                      {editCorrectAnswer ===
                                                        index && (
                                                        <span className="text-green-600 font-semibold text-sm">
                                                          ✓ Correct
                                                        </span>
                                                      )}
                                                    </label>
                                                  ),
                                                )}
                                                {editQuestionOptions.length ===
                                                  0 && (
                                                  <p className="text-sm text-gray-500 italic">
                                                    Please add at least one option
                                                    before selecting the correct
                                                    answer.
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                              <button
                                                type="button"
                                                onClick={handleSaveQuestion}
                                                disabled={actionLoading}
                                                className={`px-6 py-2.5 font-semibold rounded-lg border transition-all duration-200 shadow-sm flex items-center justify-center gap-2 ${
                                                  actionLoading
                                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 hover:shadow-md"
                                                }`}
                                              >
                                                {actionLoading ? (
                                                  <>
                                                    <svg
                                                      className="animate-spin h-4 w-4 text-gray-400"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="none"
                                                      />
                                                      <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                      />
                                                    </svg>
                                                    Saving...
                                                  </>
                                                ) : (
                                                  "Save Question"
                                                )}
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
                                                Please select one answer from the
                                                options below
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
                                                    defaultChecked={
                                                      savedAnswers[module.id]?.[
                                                        q.id
                                                      ] === option
                                                    }
                                                    className="w-5 h-5 text-pink-600 border-gray-300 focus:ring-pink-500 focus:ring-2 cursor-pointer"
                                                  />
                                                  <span className="text-gray-700 font-medium text-sm flex-1">
                                                    {option}
                                                  </span>
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
                                <div className="mt-8 pt-5 border-t-2 border-dashed border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                                  <div className="text-sm flex items-center flex-wrap gap-2">
                                    <span className="text-gray-500 font-medium">
                                      <span className="text-red-500 font-bold text-base leading-none">*</span> Required fields
                                    </span>
                                    {savedAnswers[module.id] && Object.keys(savedAnswers[module.id]).length > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-200 shadow-sm">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Answers Saved
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const form = document.querySelector("form");
                                        if (form) form.reset();
                                        const updatedAnswers = { ...savedAnswers };
                                        delete updatedAnswers[module.id];
                                        setSavedAnswers(updatedAnswers);
                                      }}
                                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-white text-slate-600 font-bold text-sm rounded-lg border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Clear
                                    </button>

                                    <button
                                      type="submit"
                                      disabled={actionLoading}
                                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 font-bold text-sm rounded-lg border-2 transition-all shadow-sm active:scale-95 ${
                                        actionLoading
                                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                                          : "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 hover:shadow-md hover:-translate-y-0.5"
                                      }`}
                                    >
                                      {actionLoading ? (
                                        <>
                                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                          </svg>
                                          Saving...
                                        </>
                                      ) : savedAnswers[module.id] && Object.keys(savedAnswers[module.id]).length > 0 ? (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          Update Answers
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Submit
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </form>
                            )
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
