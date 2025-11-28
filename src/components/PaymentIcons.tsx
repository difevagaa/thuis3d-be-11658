// Payment method icons as SVG components
// These are commonly used payment brand logos

export const VisaIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="#1A1F71"/>
    <path d="M19.5 21H17L18.7 11H21.2L19.5 21ZM15.2 11L12.8 17.8L12.5 16.3L11.5 12.1C11.5 12.1 11.4 11 10 11H6.1L6 11.2C6 11.2 7.5 11.5 9.3 12.6L11.5 21H14.1L18 11H15.2ZM35.8 21H38L36.1 11H34C32.8 11 32.5 12 32.5 12L28.5 21H31.1L31.6 19.6H34.8L35.1 21H35.8ZM32.3 17.5L33.7 13.5L34.5 17.5H32.3ZM28.8 13.8L29.2 11.2C29.2 11.2 27.8 10.7 26.3 10.7C24.7 10.7 21.1 11.4 21.1 14.4C21.1 17.2 25 17.2 25 18.7C25 20.2 21.5 19.8 20.2 18.8L19.8 21.5C19.8 21.5 21.2 22.2 23.3 22.2C25.4 22.2 28.7 21 28.7 18.3C28.7 15.5 24.8 15.2 24.8 13.9C24.8 12.6 27.5 12.8 28.8 13.8Z" fill="white"/>
  </svg>
);

export const MastercardIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="#F5F5F5"/>
    <circle cx="18" cy="16" r="10" fill="#EB001B"/>
    <circle cx="30" cy="16" r="10" fill="#F79E1B"/>
    <path d="M24 8.5C26.1 10.2 27.5 12.9 27.5 16C27.5 19.1 26.1 21.8 24 23.5C21.9 21.8 20.5 19.1 20.5 16C20.5 12.9 21.9 10.2 24 8.5Z" fill="#FF5F00"/>
  </svg>
);

export const BancontactIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="#005498"/>
    <path d="M8 10H40V22H8V10Z" fill="white"/>
    <path d="M12 14H20V18H12V14Z" fill="#FFD800"/>
    <path d="M22 14H36V18H22V14Z" fill="#005498"/>
    <text x="24" y="17" fontSize="4" fill="white" textAnchor="middle" fontWeight="bold">Bancontact</text>
  </svg>
);

export const GooglePayIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="white" stroke="#E5E5E5"/>
    <path d="M23.5 16.7V19.8H22.2V11.2H25.3C26.1 11.2 26.8 11.5 27.4 12C28 12.5 28.3 13.2 28.3 14C28.3 14.8 28 15.5 27.4 16C26.8 16.5 26.1 16.7 25.3 16.7H23.5ZM23.5 12.4V15.5H25.4C25.9 15.5 26.3 15.3 26.6 15C26.9 14.7 27.1 14.4 27.1 14C27.1 13.6 26.9 13.2 26.6 12.9C26.3 12.6 25.9 12.4 25.4 12.4H23.5Z" fill="#5F6368"/>
    <path d="M32.1 14.3C33 14.3 33.7 14.6 34.2 15.1C34.7 15.6 35 16.3 35 17.1V19.8H33.8V19C33.4 19.6 32.8 19.9 31.9 19.9C31.2 19.9 30.6 19.7 30.2 19.3C29.8 18.9 29.5 18.4 29.5 17.8C29.5 17.2 29.7 16.7 30.2 16.3C30.6 15.9 31.3 15.7 32.1 15.7H33.7V15.5C33.7 15.1 33.6 14.8 33.3 14.5C33 14.3 32.7 14.1 32.2 14.1C31.6 14.1 31.1 14.4 30.8 14.9L29.9 14.2C30.4 13.6 31.1 14.3 32.1 14.3ZM31.9 18.9C32.3 18.9 32.7 18.8 33 18.5C33.3 18.2 33.5 17.9 33.7 17.4V16.6H32.2C31.4 16.6 30.9 17 30.9 17.7C30.9 18 31 18.3 31.2 18.5C31.5 18.8 31.7 18.9 31.9 18.9Z" fill="#5F6368"/>
    <path d="M40 14.4L37.2 20.8C36.8 21.8 36.1 22.3 35.2 22.3C34.8 22.3 34.5 22.2 34.2 22.1L34.5 21.1C34.7 21.2 34.9 21.2 35.1 21.2C35.5 21.2 35.8 21 36 20.5L36.3 19.9L33.9 14.4H35.3L37 18.3L38.7 14.4H40Z" fill="#5F6368"/>
    <path d="M15.8 15.6C15.8 15.3 15.7 15 15.7 14.7H11V16.3H13.7C13.6 17 13.3 17.5 12.8 17.9V19.2H14.4C15.3 18.4 15.8 17.1 15.8 15.6Z" fill="#4285F4"/>
    <path d="M11 20.5C12.4 20.5 13.5 20.1 14.4 19.2L12.8 17.9C12.4 18.2 11.8 18.4 11 18.4C9.7 18.4 8.5 17.5 8.1 16.3H6.5V17.6C7.4 19.3 9.1 20.5 11 20.5Z" fill="#34A853"/>
    <path d="M8.1 16.3C8 16 7.9 15.7 7.9 15.4C7.9 15.1 8 14.8 8.1 14.5V13.2H6.5C6.2 13.8 6 14.6 6 15.4C6 16.2 6.2 17 6.5 17.6L8.1 16.3Z" fill="#FBBC05"/>
    <path d="M11 12.4C11.8 12.4 12.5 12.7 13.1 13.2L14.4 11.9C13.5 11.1 12.4 10.6 11 10.6C9.1 10.6 7.4 11.8 6.5 13.5L8.1 14.8C8.5 13.5 9.7 12.4 11 12.4Z" fill="#EA4335"/>
  </svg>
);

export const ApplePayIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="black"/>
    <path d="M14.2 11.2C14.6 10.7 14.9 10 14.8 9.3C14.2 9.3 13.4 9.7 13 10.2C12.6 10.6 12.2 11.4 12.3 12C13 12.1 13.7 11.7 14.2 11.2Z" fill="white"/>
    <path d="M14.8 12.2C13.8 12.1 13 12.7 12.5 12.7C12 12.7 11.3 12.2 10.5 12.3C9.5 12.3 8.5 12.9 8 13.8C6.9 15.6 7.7 18.3 8.8 19.8C9.3 20.5 9.9 21.4 10.7 21.3C11.5 21.3 11.8 20.8 12.7 20.8C13.6 20.8 13.9 21.3 14.7 21.3C15.5 21.3 16.1 20.5 16.6 19.8C17.2 19 17.4 18.2 17.5 18.1C17.5 18.1 16 17.5 16 15.8C16 14.3 17.2 13.6 17.3 13.6C16.6 12.5 15.5 12.3 14.8 12.2Z" fill="white"/>
    <path d="M22.4 10.3V21.2H24.1V17.3H26.6C28.9 17.3 30.5 15.7 30.5 13.8C30.5 11.9 28.9 10.3 26.7 10.3H22.4ZM24.1 11.7H26.2C27.8 11.7 28.7 12.6 28.7 13.8C28.7 15.1 27.8 16 26.2 16H24.1V11.7Z" fill="white"/>
    <path d="M35.3 21.3C36.7 21.3 38 20.5 38.6 19.3H38.6V21.2H40.2V15.3C40.2 13.5 38.8 12.3 36.7 12.3C34.8 12.3 33.2 13.5 33.1 15.1H34.7C34.8 14.3 35.6 13.7 36.7 13.7C37.9 13.7 38.6 14.3 38.6 15.4V16.1L36.2 16.2C34 16.4 32.8 17.3 32.8 18.8C32.8 20.3 34 21.3 35.3 21.3ZM35.7 19.9C34.7 19.9 34 19.4 34 18.7C34 17.9 34.7 17.5 35.9 17.4L38.6 17.3V18C38.6 19.1 37.3 19.9 35.7 19.9Z" fill="white"/>
  </svg>
);

export const PayPalIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="#003087"/>
    <path d="M18.5 9H13L10 23H14L14.5 20H17C21 20 23.5 17.5 24 14C24.5 10.5 22 9 18.5 9ZM17.5 17H15.5L16.5 12H18.5C20 12 21 12.5 20.5 14.5C20 16.5 18.5 17 17.5 17Z" fill="#009CDE"/>
    <path d="M32.5 9H27L24 23H28L28.5 20H31C35 20 37.5 17.5 38 14C38.5 10.5 36 9 32.5 9ZM31.5 17H29.5L30.5 12H32.5C34 12 35 12.5 34.5 14.5C34 16.5 32.5 17 31.5 17Z" fill="white"/>
  </svg>
);

export const RevolutIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="#191C1F"/>
    <path d="M14 10H18C20.5 10 22 11.5 22 13.5C22 15 21 16 19.5 16.5L22.5 22H19.5L17 17H16V22H14V10ZM17.5 15C18.5 15 19.5 14.5 19.5 13.5C19.5 12.5 18.5 12 17.5 12H16V15H17.5Z" fill="white"/>
    <circle cx="30" cy="16" r="6" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M28 16L29.5 17.5L33 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BankTransferIcon = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="32" rx="4" fill="#1E3A5F"/>
    <path d="M24 6L10 14H38L24 6Z" fill="white"/>
    <rect x="12" y="15" width="4" height="10" fill="white"/>
    <rect x="18" y="15" width="4" height="10" fill="white"/>
    <rect x="26" y="15" width="4" height="10" fill="white"/>
    <rect x="32" y="15" width="4" height="10" fill="white"/>
    <rect x="8" y="25" width="32" height="2" fill="white"/>
  </svg>
);

export const SecurePaymentIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="currentColor"/>
  </svg>
);
