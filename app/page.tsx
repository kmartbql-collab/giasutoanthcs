'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  Send, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  Flame, 
  HelpCircle, 
  Check,
  ChevronRight,
  Smile,
  Info,
  Layers,
  Award,
  LogOut,
  User as UserIcon,
  Settings,
  Key,
  Phone,
  Mail
} from 'lucide-react';
import MathText from '@/components/MathText';
import { loginWithGoogle, logoutUser } from '@/lib/firebase';

interface Step {
  label: string;
  status: 'completed' | 'active' | 'locked';
  explanation: string;
}

interface BoardState {
  problemType: string;
  givenData: string[];
  methods: string[];
  steps: Step[];
  knowledgeBox: string;
  summary?: string;
  isCompleted: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Typical SGK topics per Grade (Vietnam general curriculum)
const GRADE_TOPICS = {
  'Lớp 6': [
    { name: 'Số học & Phép tính', desc: 'Tập hợp số tự nhiên, lũy thừa, thứ tự thực hiện phép tính, chia hết.' },
    { name: 'Ước & Bội số', desc: 'Ước chung lớn nhất (UCLN), Bội chung nhỏ nhất (BCNN) và ứng dụng.' },
    { name: 'Phân số & Số thập phân', desc: 'Phép tính phân số, tỉ số phần trăm, giải toán phân số.' },
    { name: 'Hình học trực quan', desc: 'Tam giác đều, lục giác đều, hình vuông, hình chữ nhật, hình thoi.' }
  ],
  'Lớp 7': [
    { name: 'Số hữu tỉ & Số thực', desc: 'Tập hợp Q, số thập phân vô hạn tuần hoàn, căn bậc hai số học, số thực.' },
    { name: 'Đại lượng tỉ lệ', desc: 'Tỉ lệ thức, tính chất dãy tỉ số bằng nhau, tỉ lệ thuận, tỉ lệ nghịch.' },
    { name: 'Biểu thức đại số', desc: 'Đơn thức, đa thức một biến, phép cộng trừ nhân chia đa thức một biến.' },
    { name: 'Hình học phẳng', desc: 'Góc ở vị trí đặc biệt, định lý, các trường hợp bằng nhau của tam giác.' }
  ],
  'Lớp 8': [
    { name: 'Đa thức & Hằng đẳng thức', desc: 'Phép nhân đa thức, 7 hằng đẳng thức đáng nhớ, phân tích thành nhân tử.' },
    { name: 'Phân thức đại số', desc: 'Khái niệm, tính chất cơ bản, các phép toán cộng trừ nhân chia phân thức.' },
    { name: 'Hàm số & Đồ thị', desc: 'Hàm số bậc nhất $y = ax + b$, hệ số góc, đồ thị hàm số.' },
    { name: 'Hình học không gian & Phẳng', desc: 'Tứ giác (hình bình hành, hình thoi, hình chữ nhật, hình vuông), định lý Pythagore.' }
  ],
  'Lớp 9': [
    { name: 'Căn bậc hai & Căn bậc ba', desc: 'Căn bậc hai, hằng đẳng thức $\\sqrt{A^2} = |A|$, biến đổi đơn giản căn thức.' },
    { name: 'Hệ hai phương trình bậc nhất', desc: 'Phương pháp thế, cộng đại số, giải toán bằng cách lập hệ phương trình.' },
    { name: 'Phương trình bậc hai & Vi-ét', desc: 'Công thức nghiệm, định lý Vi-ét và các ứng dụng biện luận nghiệm.' },
    { name: 'Hình học & Đường tròn', desc: 'Hệ thức lượng trong tam giác vuông, đường tròn, góc với đường tròn.' }
  ]
};

// Real typical textbook problems matching Vietnam General Education Standards
const SAMPLE_PROBLEMS = {
  'Lớp 6': [
    {
      title: 'Tìm số tự nhiên x (Lũy thừa)',
      problem: 'Tìm số tự nhiên $x$, biết: $2^x \\cdot 4 = 32$.',
      hint: 'Đưa các số về cùng cơ số 2.'
    },
    {
      title: 'Bài toán đố BCNN',
      problem: 'Một trường học có số học sinh xếp hàng 12, hàng 15, hàng 18 đều vừa đủ. Tính số học sinh trường đó, biết số học sinh trong khoảng từ 500 đến 600 em.',
      hint: 'Gọi số học sinh là x, x chia hết cho 12, 15, 18 nên x là bội chung.'
    }
  ],
  'Lớp 7': [
    {
      title: 'Dãy tỉ số bằng nhau',
      problem: 'Tìm hai số $x$ và $y$, biết: $\\frac{x}{3} = \\frac{y}{5}$ và $x + y = 16$.',
      hint: 'Áp dụng tính chất dãy tỉ số bằng nhau: $\\frac{x}{3} = \\frac{y}{5} = \\frac{x+y}{3+5}$.'
    },
    {
      title: 'Hình học (Chứng minh tam giác)',
      problem: 'Cho tam giác $ABC$ cân tại $A$. Gọi $M$ là trung điểm của $BC$. Chứng minh rằng tam giác $ABM$ bằng tam giác $ACM$.',
      hint: 'Sử dụng trường hợp bằng nhau Cạnh - Cạnh - Cạnh (c.c.c).'
    }
  ],
  'Lớp 8': [
    {
      title: 'Rút gọn biểu thức đại số',
      problem: 'Rút gọn biểu thức sau: $A = (x + 2)^2 - x(x - 3)$.',
      hint: 'Khai triển hằng đẳng thức $(x+2)^2$ rồi nhân đơn thức với đa thức.'
    },
    {
      title: 'Phân tích đa thức thành nhân tử',
      problem: 'Phân tích đa thức sau thành nhân tử: $B = x^2 - 4x + 4 - y^2$.',
      hint: 'Nhóm $x^2 - 4x + 4$ thành một hằng đẳng thức $(x-2)^2$, sau đó dùng hiệu hai bình phương.'
    }
  ],
  'Lớp 9': [
    {
      title: 'Giải hệ hai phương trình',
      problem: 'Giải hệ phương trình sau: $\\begin{cases} 2x + y = 5 \\\\ 3x - y = 5 \\end{cases}$.',
      hint: 'Dùng phương pháp cộng đại số vì hệ số của y đối nhau ($+1$ và $-1$).'
    },
    {
      title: 'Biện luận nghiệm & Định lý Vi-ét',
      problem: 'Cho phương trình bậc hai: $x^2 - 5x + m = 0$. Tìm giá trị của tham số $m$ để phương trình có hai nghiệm phân biệt $x_1, x_2$ thỏa mãn: $x_1^2 + x_2^2 = 17$.',
      hint: 'Tính $\\Delta > 0$, viết hệ thức Vi-ét, biến đổi $x_1^2 + x_2^2 = (x_1+x_2)^2 - 2x_1x_2$.'
    }
  ]
};

// Math symbol suggestions panel for students to easily type mathematical syntax
const MATH_SYMBOLS = [
  { label: 'x²', val: 'x^2' },
  { label: 'y²', val: 'y^2' },
  { label: 'Căn thức', val: '\\sqrt{x}' },
  { label: 'Phân số', val: '\\frac{a}{b}' },
  { label: 'Hệ phương trình', val: '\\begin{cases}  \\\\  \\end{cases}' },
  { label: 'Delta (Δ)', val: '\\Delta' },
  { label: 'Pi (π)', val: '\\pi' },
  { label: 'Lớn hơn hoặc bằng (≥)', val: '\\ge' },
  { label: 'Bé hơn hoặc bằng (≤)', val: '\\le' },
  { label: 'Khác (≠)', val: '\\neq' },
  { label: 'Xấp xỉ (≈)', val: '\\approx' },
  { label: 'Cộng trừ (±)', val: '\\pm' }
];

export default function Home() {
  const [grade, setGrade] = useState<'Lớp 6' | 'Lớp 7' | 'Lớp 8' | 'Lớp 9'>('Lớp 6');
  const [tutor, setTutor] = useState<'Thầy Khoa' | 'Cô Lan'>('Thầy Khoa');
  const [activeSession, setActiveSession] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [customProblem, setCustomProblem] = useState('');
  
  // Auth & Profile state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userApiKey, setUserApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Scroll refs
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('tutor_email');
    const savedPhone = localStorage.getItem('tutor_phone');
    const savedGrade = localStorage.getItem('tutor_grade');
    const savedApiKey = localStorage.getItem('tutor_apikey');
    const savedAccessToken = localStorage.getItem('tutor_accessToken');

    if (savedEmail && savedApiKey) {
      setEmail(savedEmail);
      if (savedPhone) setPhone(savedPhone);
      if (savedGrade) setGrade(savedGrade as any);
      setUserApiKey(savedApiKey);
      if (savedAccessToken) setAccessToken(savedAccessToken);
      setIsLoggedIn(true);
    }
  }, []);

  // Auto scroll to chat end
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      const result = await loginWithGoogle();
      if (result && result.user) {
        setEmail(result.user.email || '');
        if (result.accessToken) {
          setAccessToken(result.accessToken);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Đăng nhập bằng tài khoản Google thất bại.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSavingProfile(true);

    if (!email) {
      setAuthError('Vui lòng kết nối tài khoản Google của bạn.');
      setIsSavingProfile(false);
      return;
    }
    if (!phone.trim()) {
      setAuthError('Vui lòng nhập số điện thoại.');
      setIsSavingProfile(false);
      return;
    }
    if (!userApiKey.trim()) {
      setAuthError('Vui lòng cung cấp API Key Gemini của bạn.');
      setIsSavingProfile(false);
      return;
    }

    try {
      // Save info to Google Sheet
      if (accessToken) {
        const res = await fetch('/api/sheet/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            email,
            phone,
            grade
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Lỗi khi lưu thông tin vào Google Sheets.');
        }
      }

      // Save to localStorage
      localStorage.setItem('tutor_email', email);
      localStorage.setItem('tutor_phone', phone);
      localStorage.setItem('tutor_grade', grade);
      localStorage.setItem('tutor_apikey', userApiKey);
      if (accessToken) {
        localStorage.setItem('tutor_accessToken', accessToken);
      }

      setIsLoggedIn(true);
      setShowSettings(false);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Lỗi khi đồng bộ dữ liệu người học.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('tutor_email');
    localStorage.removeItem('tutor_phone');
    localStorage.removeItem('tutor_grade');
    localStorage.removeItem('tutor_apikey');
    localStorage.removeItem('tutor_accessToken');
    setEmail('');
    setPhone('');
    setUserApiKey('');
    setAccessToken('');
    setIsLoggedIn(false);
    setActiveSession(false);
    setMessages([]);
    setBoardState(null);
  };

  // Start tutoring session with a math problem
  const handleStartSession = async (problemText: string) => {
    setActiveSession(true);
    setIsLoading(true);
    
    const initialPrompt = `Chào ${tutor}, em muốn tìm hiểu và cùng ${tutor} giải bài toán này từng bước ạ:
    ${problemText}
    
    Hãy giúp em phân tích và hướng dẫn em bước đầu tiên nhé!`;

    const initialUserMsg: Message = { role: 'user', content: initialPrompt };
    setMessages([initialUserMsg]);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          messages: [initialUserMsg],
          userApiKey
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch tutor response');
      }

      const data = await res.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.chatMessage }
      ]);
      setBoardState(data.boardState);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: err.message || 'Thầy/Cô xin lỗi, hệ thống đang gặp lỗi kết nối một chút. Em có thể gửi lại đề bài để bắt đầu nhé!' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit student's message/response in the active chat session
  const handleSubmitMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    const studentText = inputVal.trim();
    setInputVal('');

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: studentText }
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          messages: newMessages,
          userApiKey
        })
      });

      if (!res.ok) {
        throw new Error('Failed to fetch tutor response');
      }

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.chatMessage }
      ]);
      
      if (data.boardState) {
        setBoardState(data.boardState);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Thầy/Cô chưa nghe rõ câu trả lời của em do lỗi mạng. Em có thể gõ lại được không?' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Insert a mathematical symbol into the active text input
  const insertSymbol = (symbolVal: string) => {
    setInputVal(prev => prev + symbolVal);
  };

  const handleReset = () => {
    setActiveSession(false);
    setMessages([]);
    setBoardState(null);
    setInputVal('');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center justify-center p-4 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-3xl shadow-md mx-auto mb-4">
              Σ
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Gia Sư Toán THCS</h1>
            <p className="text-sm text-indigo-600 font-semibold uppercase tracking-wider">Đồng hành tự học • Học tập thông minh</p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            {!email ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 text-center">
                  Vui lòng đăng nhập bằng Google để xác thực và cho phép lưu trữ kết quả học tập tự động vào Google Sheets của bạn.
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 border border-slate-200 rounded-xl shadow-xs transition duration-150 active:scale-98 cursor-pointer"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Đăng nhập với Google</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-3 flex items-center gap-2.5 text-xs font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="truncate">Đã liên kết: <span className="underline">{email}</span></div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Nhập số điện thoại học sinh/phụ huynh"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none transition text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Lớp học
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as any)}
                    className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-slate-800 outline-none bg-white transition text-sm font-medium"
                  >
                    <option value="Lớp 6">Lớp 6</option>
                    <option value="Lớp 7">Lớp 7</option>
                    <option value="Lớp 8">Lớp 8</option>
                    <option value="Lớp 9">Lớp 9</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Key className="w-3.5 h-3.5" />
                      Gemini API Key của bạn
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-600 hover:underline font-bold normal-case flex items-center gap-0.5"
                    >
                      Lấy khóa miễn phí
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="AIzaSy..."
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none transition text-sm font-medium font-mono"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    * Khoá API của bạn được lưu an toàn trực tiếp trên trình duyệt cá nhân và chỉ sử dụng cho các yêu cầu gia sư toán của riêng bạn.
                  </p>
                </div>

                {authError && (
                  <div className="bg-red-50 text-red-800 border border-red-100 rounded-xl p-3 text-xs font-medium text-center">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-100 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 cursor-pointer"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu cấu hình học viên...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Bắt đầu học ngay</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-red-600 hover:underline font-medium"
                  >
                    Thay đổi tài khoản Google liên kết
                  </button>
                </div>
              </form>
            )}

            {authError && !email && (
              <div className="mt-4 bg-red-50 text-red-800 border border-red-100 rounded-xl p-3 text-xs font-medium text-center">
                {authError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Welcome / Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-sm">
              Σ
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">Gia Sư Toán THCS</h1>
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Đồng hành tự học • Tư duy logic • Học tập thông minh</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-700">
            {isLoggedIn && (
              <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
                <span className="text-xs text-slate-500 max-w-[150px] truncate font-medium hidden sm:inline">{email}</span>
                <button
                  onClick={() => {
                    setAuthError('');
                    setShowSettings(true);
                  }}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition active:scale-95 cursor-pointer"
                  title="Cấu hình tài khoản / API Key"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-red-50 text-red-600 hover:border-red-200 transition active:scale-95 cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeSession && (
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition active:scale-95 bg-white text-slate-700 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Đổi bài toán khác</span>
              </button>
            )}

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 items-center text-sm font-medium">
              {(['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'] as const).map((l) => (
                <button
                  key={l}
                  disabled={activeSession}
                  onClick={() => setGrade(l)}
                  className={`px-3 py-1 rounded-md transition text-xs sm:text-sm ${
                    grade === l 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-indigo-800 disabled:opacity-60 disabled:hover:text-slate-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6">
        <AnimatePresence mode="wait">
          {!activeSession ? (
            /* ==================== DASHBOARD / HOMEPAGE ==================== */
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col gap-6"
            >
              {/* Teacher Introduction Hero Block */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-indigo-900 text-white rounded-2xl p-6 shadow-md overflow-hidden relative border border-indigo-950">
                <div className="lg:col-span-8 flex flex-col justify-between gap-6 z-10">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-indigo-200 font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                      Gia sư AI thế hệ mới
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                      Học Toán Chủ Động, Khai Phá Bản Chất Đề Bài
                    </h2>
                    <p className="text-indigo-100 leading-relaxed max-w-2xl text-sm sm:text-base">
                      Thầy cô gia sư ảo sẽ không giải hộ toán cho em ngay lập tức! Thay vào đó, thầy cô sẽ phân tích đề, gợi mở lý thuyết trong SGK và hướng dẫn em tự làm từng bước nhỏ qua các câu hỏi thông minh. Phương pháp này giúp em ghi nhớ lâu, hiểu sâu bản chất vấn đề và rèn luyện tư duy logic tốt nhất.
                    </p>
                  </div>

                  {/* Tutor Selector */}
                  <div className="space-y-3 border-t border-indigo-800/60 pt-4">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Chọn Gia Sư Đồng Hành:</span>
                    <div className="flex flex-wrap gap-4">
                      {/* Thầy Khoa */}
                      <button
                        onClick={() => setTutor('Thầy Khoa')}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all w-full sm:w-64 relative overflow-hidden ${
                          tutor === 'Thầy Khoa'
                            ? 'bg-white/10 border-white/30 text-white ring-1 ring-white/40 shadow-sm'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                          👨‍🏫
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">Thầy Khoa</h4>
                          <p className="text-xs text-indigo-200">Giàu kinh nghiệm, đề cao logic, súc tích và mạch lạc.</p>
                        </div>
                        {tutor === 'Thầy Khoa' && (
                          <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>

                      {/* Cô Lan */}
                      <button
                        onClick={() => setTutor('Cô Lan')}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all w-full sm:w-64 relative overflow-hidden ${
                          tutor === 'Cô Lan'
                            ? 'bg-white/10 border-white/30 text-white ring-1 ring-white/40 shadow-sm'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-pink-500/20 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                          👩‍🏫
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">Cô Lan</h4>
                          <p className="text-xs text-indigo-200">Tỉ mỉ, ân cần, khích lệ, giảng giải chi tiết từng bước.</p>
                        </div>
                        {tutor === 'Cô Lan' && (
                          <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Geometric decoration background pattern */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none hidden lg:block">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="2"/>
                    <path d="M10 50 L90 50 M50 10 L50 90" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>

                <div className="hidden lg:col-span-4 lg:flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-white/5 rounded-2xl -rotate-3 opacity-60"></div>
                  <div className="bg-white text-slate-800 p-5 rounded-xl shadow-xl w-64 border border-slate-200 relative transform rotate-1 flex flex-col justify-between min-h-[220px]">
                    <div className="border-b border-dashed border-slate-200 pb-2 mb-3">
                      <span className="text-xs text-indigo-600 font-mono font-bold">BẢNG SƯ PHẠM</span>
                    </div>
                    <div className="space-y-3 flex-1 font-mono text-xs text-slate-700">
                      <p className="text-slate-900 font-bold">1. Phân tích dữ kiện</p>
                      <p className="text-slate-500">$x^2 - 4x + 4 = 0$</p>
                      <p className="text-slate-900 font-semibold">2. Gợi ý công thức:</p>
                      <p className="text-indigo-600">$(a-b)^2 = a^2 - 2ab + b^2$</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 mt-2 font-semibold">
                      ✏️ Gia sư {tutor}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid with Custom Problem Input & Examples */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left side: Input Custom Problem */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-indigo-800">
                    <BookOpen className="w-5 h-5" />
                    <h3 className="font-bold text-lg text-slate-800">Nhập Bài Toán Cần Giải của Em</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Em hãy nhập đề bài bất kỳ (hình học, tìm x, rút gọn, bài toán đố...) của lớp {grade} vào khung dưới đây. Thầy cô sẽ cùng em khám phá phương pháp giải.
                  </p>

                  <div className="space-y-3">
                    <textarea
                      placeholder="Ví dụ: Rút gọn biểu thức (x+2)^2 - x(x-3)... hoặc gõ bài toán bất kỳ của em tại đây..."
                      value={customProblem}
                      onChange={(e) => setCustomProblem(e.target.value)}
                      rows={4}
                      className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl p-4 text-slate-800 placeholder:text-slate-400 outline-none transition text-sm font-medium"
                    />

                    {/* Simple LaTeX button prompt */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold self-center px-1">Chèn nhanh ký hiệu:</span>
                      {MATH_SYMBOLS.slice(0, 7).map((sym) => (
                        <button
                          key={sym.label}
                          onClick={() => setCustomProblem(prev => prev + ' ' + sym.val + ' ')}
                          className="px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs rounded transition font-mono shadow-xs active:scale-95"
                        >
                          {sym.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleStartSession(customProblem)}
                      disabled={!customProblem.trim() || isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-100 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-98 cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Bắt đầu tự học cùng {tutor}</span>
                    </button>
                  </div>
                </div>

                {/* Right side: Example Problems for current Grade */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-indigo-800">
                    <Flame className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-lg text-slate-800">Đề Bài Mẫu - {grade}</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Em chưa có đề bài sẵn? Thử chọn ngay một bài toán mẫu chuẩn sách giáo khoa Việt Nam dưới đây để xem cách gia sư gợi ý nhé:
                  </p>

                  <div className="flex flex-col gap-3">
                    {SAMPLE_PROBLEMS[grade as keyof typeof SAMPLE_PROBLEMS]?.map((prob, idx) => (
                      <div 
                        key={idx}
                        className="border border-slate-200 rounded-xl p-4 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all group flex flex-col justify-between gap-3 text-left"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                              {prob.title}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-800">
                            <MathText text={prob.problem} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500 italic">
                            Gợi ý: {prob.hint}
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartSession(prob.problem)}
                          className="mt-1 self-end inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition"
                        >
                          <span>Giải bài này</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Syllabus / Curriculum breakdown */}
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chủ đề chính trong kỳ thi {grade}:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {GRADE_TOPICS[grade as keyof typeof GRADE_TOPICS]?.slice(0, 4).map((topic, i) => (
                        <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-xs font-bold text-slate-800 block">{topic.name}</span>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{topic.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          ) : (
            /* ==================== ACTIVE TUTORING WORKSPACE ==================== */
            <motion.div 
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
              
              {/* Left Column: Interactive Chat Log & Answer Panel */}
              <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[620px] max-h-[800px]">
                
                {/* Chat Header */}
                <div className="bg-slate-50/50 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-sm ${
                      tutor === 'Thầy Khoa' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                    }`}>
                      {tutor === 'Thầy Khoa' ? '👨‍🏫' : '👩‍🏫'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-sm">Gia sư {tutor}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      </div>
                      <span className="text-xs text-slate-500">Đang hướng dẫn em • {grade}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReset}
                      className="text-xs font-semibold text-slate-500 hover:text-indigo-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition shadow-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Chọn bài khác</span>
                    </button>
                  </div>
                </div>

                {/* Chat Logs Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    // Strip the instruction part from user's first prompt to keep interface clean
                    const cleanContent = isUser && msg.content.includes("Chào " + tutor)
                      ? msg.content.split("\n").slice(1).join("\n").replace("Hãy giúp em phân tích và hướng dẫn em bước đầu tiên nhé!", "").trim()
                      : msg.content;

                    return (
                      <div 
                        key={index}
                        className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        {!isUser && (
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-sm ${
                            tutor === 'Thầy Khoa' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {tutor === 'Thầy Khoa' ? '👨‍🏫' : '👩‍🏫'}
                          </div>
                        )}

                        <div className="space-y-1">
                          {/* Sender name */}
                          <div className={`text-[10px] font-bold text-slate-400 ${isUser ? 'text-right' : ''}`}>
                            {isUser ? 'Học sinh' : tutor}
                          </div>

                          {/* Message Bubble */}
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xs ${
                            isUser 
                              ? 'bg-indigo-600 text-white rounded-tr-none font-medium' 
                              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none font-medium'
                          }`}>
                            <MathText text={cleanContent} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Thought/Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[80%]">
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-sm ${
                        tutor === 'Thầy Khoa' ? 'bg-blue-100' : 'bg-pink-100'
                      }`}>
                        {tutor === 'Thầy Khoa' ? '👨‍🏫' : '👩‍🏫'}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400">Gia sư {tutor}</span>
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-2 text-sm text-slate-500">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></span>
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                          <span>Thầy/Cô đang suy nghĩ hướng dẫn cho em...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Mathematical Symbol Assistant Drawer */}
                <div className="bg-slate-50 border-t border-slate-200 p-2 flex flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-slate-500 self-center px-2">Bàn phím Toán học:</span>
                  {MATH_SYMBOLS.map((sym) => (
                    <button
                      key={sym.label}
                      disabled={isLoading}
                      onClick={() => insertSymbol(sym.val)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-xs text-slate-800 rounded-md transition font-mono shadow-xs hover:text-indigo-800 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-slate-200 active:scale-95 animate-none"
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>

                {/* Form input */}
                <form 
                  onSubmit={handleSubmitMessage}
                  className="bg-white border-t border-slate-200 p-4 flex gap-3 items-center"
                >
                  <input
                    type="text"
                    disabled={isLoading}
                    placeholder={
                      boardState?.isCompleted 
                        ? 'Chúc mừng em đã hoàn thành bài toán! Gõ lời cảm ơn hoặc chọn bài mới nhé.'
                        : 'Nhập câu trả lời hoặc thắc mắc của em tại đây...'
                    }
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="flex-1 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-sm placeholder:text-slate-400 outline-none transition font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!inputVal.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-md transition disabled:opacity-50 active:scale-95 cursor-pointer"
                    title="Gửi câu trả lời"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>

                {/* Interactive quick prompt buttons to help student answer easily */}
                {!boardState?.isCompleted && (
                  <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setInputVal('Thầy/Cô hướng dẫn chi tiết thêm cho em được không ạ?')}
                      disabled={isLoading}
                      className="text-xs bg-white border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition active:scale-95 disabled:opacity-50"
                    >
                      💡 Thầy/Cô gợi ý kỹ hơn được không ạ?
                    </button>
                    <button
                      onClick={() => setInputVal('Dạ, em chưa hiểu bước tính toán vừa rồi, tại sao lại ra như vậy ạ?')}
                      disabled={isLoading}
                      className="text-xs bg-white border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition active:scale-95 disabled:opacity-50"
                    >
                      ❓ Em chưa hiểu cách biến đổi này ạ
                    </button>
                    <button
                      onClick={() => setInputVal('Em đã làm xong bước này, tiếp theo làm thế nào hả Thầy/Cô?')}
                      disabled={isLoading}
                      className="text-xs bg-white border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition active:scale-95 disabled:opacity-50"
                    >
                      ⏭️ Em làm xong rồi, tiếp theo làm gì ạ?
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Pedagogical Board (Geometric White Slate Style of Geometric Balance) */}
              <div className="lg:col-span-5 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[620px] max-h-[800px] relative overflow-hidden">
                
                {/* Board Frame & Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                    <span className="font-bold font-sans tracking-wide text-xs text-slate-500 uppercase">Phân tích & Hướng dẫn</span>
                  </div>
                  <div className="font-mono text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md font-bold">
                    ✏️ Gia sư {tutor}
                  </div>
                </div>

                {/* Board Scrollable Content */}
                {boardState ? (
                  <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-800 leading-relaxed font-sans">
                    
                    {/* Problem Category */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">📖 DẠNG TOÁN CHÍNH:</span>
                      <div className="text-slate-950 font-bold text-base border-b border-slate-100 pb-2">
                        {boardState.problemType}
                      </div>
                    </div>

                    {/* Given Data (Dữ kiện) */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">📌 DỮ KIỆN QUAN TRỌNG:</span>
                      <ul className="grid grid-cols-1 gap-1.5">
                        {boardState.givenData?.map((data, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <MathText text={data} />
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Formulas / SGK Methods */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">🛠️ CÔNG THỨC & LÝ THUYẾT SGK LIÊN QUAN:</span>
                      <div className="flex flex-col gap-2">
                        {boardState.methods?.map((m, idx) => (
                          <div key={idx} className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 font-semibold">
                            <MathText text={m} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step-by-step Map */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">🗺️ LỘ TRÌNH GIẢI TOÁN TỪNG BƯỚC:</span>
                      <div className="space-y-2 relative">
                        {boardState.steps?.map((step, idx) => {
                          const isActive = step.status === 'active';
                          const isCompleted = step.status === 'completed';
                          const isLocked = step.status === 'locked';

                          return (
                            <div 
                              key={idx}
                              className={`rounded-xl p-4 border transition-all ${
                                isActive 
                                  ? 'bg-indigo-50 border-indigo-300 text-slate-900 shadow-xs' 
                                  : isCompleted 
                                    ? 'bg-slate-50/50 border-slate-100 text-slate-400 line-through opacity-70' 
                                    : 'bg-slate-50/10 border-slate-100/30 text-slate-300 opacity-40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-2">
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                                  ) : isActive ? (
                                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                                      {idx + 1}
                                    </span>
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="text-xs font-bold">
                                    <MathText text={step.label} />
                                  </div>
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                                  isActive 
                                    ? 'bg-indigo-100 text-indigo-700' 
                                    : isCompleted 
                                      ? 'bg-slate-100 text-slate-500' 
                                      : 'bg-slate-100/50 text-slate-300'
                                }`}>
                                  {isActive ? 'Đang giải' : isCompleted ? 'Xong' : 'Khóa'}
                                </span>
                              </div>
                              
                              {isActive && step.explanation && (
                                <p className="mt-2 text-xs text-slate-600 border-t border-dashed border-indigo-100 pt-2 leading-relaxed">
                                  {step.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Knowledge box (Hộp kiến thức) */}
                    {boardState.knowledgeBox && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-indigo-600">
                          <Info className="w-4 h-4" />
                          <span className="text-[10px] font-bold font-sans">💡 GỢI Ý ĐỊNH HƯỚNG:</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <MathText text={boardState.knowledgeBox} />
                        </p>
                      </div>
                    )}

                    {/* Celebratory Lesson Summary (Tổng kết bài học) */}
                    {boardState.isCompleted && boardState.summary && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-indigo-900 text-white border border-indigo-950 rounded-xl p-4 space-y-2 shadow-lg relative overflow-hidden"
                      >
                        <div className="flex items-center gap-2 text-indigo-200">
                          <Award className="w-5 h-5" />
                          <span className="font-bold text-sm">🎓 TỔNG KẾT BÀI HỌC CỐT LÕI:</span>
                        </div>
                        <div className="text-xs leading-relaxed text-indigo-50">
                          <MathText text={boardState.summary} />
                        </div>
                        <div className="pt-2 border-t border-indigo-800/60 flex justify-between items-center text-[10px]">
                          <span className="text-indigo-300 font-bold">✨ Em đã hoàn thành xuất sắc!</span>
                          <button
                            onClick={handleReset}
                            className="bg-white hover:bg-indigo-50 text-indigo-900 font-bold px-2.5 py-1 rounded transition active:scale-95 text-[10px]"
                          >
                            Học bài mới
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </div>
                ) : (
                  /* Loading blackboard state */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Layers className="w-12 h-12 mb-3 text-indigo-300 animate-pulse" />
                    <span className="text-xs">Đang đồng bộ hóa bảng viết...</span>
                  </div>
                )}

                {/* Pedagogical Board Footer */}
                <div className="p-4 bg-slate-900 text-white rounded-b-2xl flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-300">Đã đồng bộ hóa bảng viết • Lớp {grade}</span>
                  <div className="flex space-x-2">
                    <button onClick={handleReset} className="px-3 py-1 bg-white/10 rounded text-xs hover:bg-white/20 transition">Đổi bài khác</button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-medium text-indigo-600">Khơi nguồn đam mê học toán - Gia Sư Thân Thiện Lớp 6, 7, 8, 9</p>
          <p>Ứng dụng tuân thủ nội dung chuẩn chương trình GDPT của Bộ Giáo dục và Đào tạo Việt Nam.</p>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <span>Cấu hình Tài khoản</span>
              </h3>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setAuthError('');
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tài khoản Google</label>
                <input
                  type="text"
                  disabled
                  value={email}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  placeholder="Nhập số điện thoại của bạn"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-slate-800 outline-none transition text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Lớp học</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as any)}
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-slate-800 outline-none bg-white transition text-sm font-medium"
                >
                  <option value="Lớp 6">Lớp 6</option>
                  <option value="Lớp 7">Lớp 7</option>
                  <option value="Lớp 8">Lớp 8</option>
                  <option value="Lớp 9">Lớp 9</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                  <span>Gemini API Key của bạn</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-600 hover:underline font-bold normal-case"
                  >
                    Lấy khoá mới
                  </a>
                </label>
                <input
                  type="password"
                  required
                  placeholder="AIzaSy..."
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-2.5 text-slate-800 outline-none transition text-sm font-medium font-mono"
                />
              </div>

              {authError && (
                <div className="bg-red-50 text-red-800 border border-red-100 rounded-xl p-3 text-xs font-medium text-center">
                  {authError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setAuthError('');
                  }}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition text-sm text-center cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingProfile ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Lưu cấu hình</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
