declare namespace NodeJS {
  interface ProcessEnv {
    // JWT Authentication
    JWT_SECRET?: string;
    
    // Gmail
    GMAIL_USER?: string;
    GMAIL_PASS?: string;
    
    // SendGrid
    SENDGRID_API_KEY?: string;
    SENDGRID_FROM_EMAIL?: string;
    
    // Cloudinary
    CLOUDINARY_CLOUD_NAME?: string;
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
    
    // Database
    DATABASE_URL?: string;
    PG_CONNECTION?: string;
    
    // API URLs
    EXPRESS_API_URL?: string;
    
    // Web3Forms
    WEB3FORMS_ACCESS_KEY?: string;
    
    // Node Environment (standard, but included for completeness)
    NODE_ENV?: 'development' | 'production' | 'test';
  }
}
