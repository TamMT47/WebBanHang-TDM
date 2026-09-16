'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Search,
  Users,
  Award,
  AlertTriangle,
  PlayCircle,
  Download,
  Eye,
  Check,
  RotateCw,
  FolderOpen,
  Layers,
  ArrowRight,
  HelpCircle,
  BadgePercent
} from 'lucide-react';
import { UserRole, TrainingSection, TrainingFileType, TrainingMaterial, TrainingUserProgress } from '@/types/database';

interface TrainingViewProps {
  user: {
    id: string;
    username: string;
    full_name: string;
    role: UserRole;
  };
}

const SECTION_TABS = [
  { id: 'all', label: 'Tất Cả Bài Học', icon: Layers, desc: 'Tổng hợp toàn bộ tài liệu' },
  { id: 'regulations', label: '1. Quy Định & Tác Phong', icon: BookOpen, desc: 'Nội quy, 5S & đồng phục' },
  { id: 'operations', label: '2. Nghiệp Vụ & POS', icon: FileCode, desc: 'Bán hàng, test máy & bảo hành' },
  { id: 'promotions', label: '3. Bảng Giá & Ưu Đãi', icon: Award, desc: 'Bảng giá tháng, trợ giá thu cũ' },
];

export default function TrainingView({ user }: TrainingViewProps) {
  const isManagerOrAbove = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isStaff = user?.role === 'staff';

  const [activeSection, setActiveSection] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'materials' | 'progress'>('materials');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data state
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [userProgressList, setUserProgressList] = useState<TrainingUserProgress[]>([]);

  // Modal State: Add / Edit Material
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null);
  const [formSection, setFormSection] = useState<TrainingSection>('regulations');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFileType, setFormFileType] = useState<TrainingFileType>('pdf');
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formIsMandatory, setFormIsMandatory] = useState(true);
  const [savingForm, setSavingForm] = useState(false);

  // Modal State: View / Preview Material Detail
  const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);

  // Fetch training data
  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/training?section=${activeSection}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải tài liệu đào tạo');
      setMaterials(data.materials || []);
      if (data.userProgress) {
        setUserProgressList(data.userProgress || []);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, [activeSection]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSection = activeSection === 'all' || m.section === activeSection;
      const matchSearch =
        !search.trim() ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
        (m.file_name && m.file_name.toLowerCase().includes(search.toLowerCase()));
      return matchSection && matchSearch;
    });
  }, [materials, activeSection, search]);

  // Staff Personal Progress
  const myTotalCount = materials.length;
  const myCompletedCount = materials.filter((m) => m.is_completed).length;
  const myProgressPct = myTotalCount > 0 ? Math.round((myCompletedCount / myTotalCount) * 100) : 0;

  // Toggle Confirm Read & Understand
  const handleToggleComplete = async (materialId: string, currentStatus?: boolean) => {
    try {
      setActionLoadingId(materialId);
      const nextStatus = !currentStatus;

      // Optimistic update
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, is_completed: nextStatus } : m))
      );

      const res = await fetch('/api/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_complete',
          material_id: materialId,
          completed: nextStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật tiến độ');
      setMessage({ type: 'success', text: data.message });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
      fetchTrainingData();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = (defaultSec?: TrainingSection) => {
    setEditingMaterial(null);
    setFormSection(defaultSec || (activeSection !== 'all' ? (activeSection as TrainingSection) : 'regulations'));
    setFormTitle('');
    setFormDescription('');
    setFormContent('');
    setFormFileType('pdf');
    setFormFileName('');
    setFormFileSize('');
    setFormFileUrl('');
    setFormVideoUrl('');
    setFormIsMandatory(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: TrainingMaterial) => {
    setEditingMaterial(item);
    setFormSection(item.section);
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormContent(item.content || '');
    setFormFileType(item.file_type || 'none');
    setFormFileName(item.file_name || '');
    setFormFileSize(item.file_size || '');
    setFormFileUrl(item.file_url || '');
    setFormVideoUrl(item.video_url || '');
    setFormIsMandatory(item.is_mandatory !== false);
    setIsModalOpen(true);
  };

  // Handle File Upload from device (converts small files to base64 or reads filename/size)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormFileName(file.name);
    // Format size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFormFileSize(`${sizeInMB} MB`);

    // Detect file type
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) setFormFileType('pdf');
    else if (['doc', 'docx'].includes(ext)) setFormFileType('doc');
    else if (['xls', 'xlsx', 'csv'].includes(ext)) setFormFileType('excel');
    else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) setFormFileType('image');
    else if (['mp4', 'mov', 'webm'].includes(ext)) setFormFileType('video');
    else setFormFileType('link');

    // Read small file into Data URL
    if (file.size < 10 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Modal Form (Add or Edit)
  const handleSaveMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Vui lòng nhập tiêu đề bài học!');
      return;
    }

    try {
      setSavingForm(true);
      if (editingMaterial) {
        // Update
        const res = await fetch('/api/training', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_material',
            id: editingMaterial.id,
            section: formSection,
            title: formTitle,
            description: formDescription,
            content: formContent,
            file_type: formFileType,
            file_name: formFileName,
            file_size: formFileSize,
            file_url: formFileUrl,
            video_url: formVideoUrl,
            is_mandatory: formIsMandatory,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật bài học');
        setMessage({ type: 'success', text: data.message });
      } else {
        // Create
        const res = await fetch('/api/training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: formSection,
            title: formTitle,
            description: formDescription,
            content: formContent,
            file_type: formFileType,
            file_name: formFileName,
            file_size: formFileSize,
            file_url: formFileUrl,
            video_url: formVideoUrl,
            is_mandatory: formIsMandatory,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi thêm bài học');
        setMessage({ type: 'success', text: data.message });
      }

      setIsModalOpen(false);
      fetchTrainingData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingForm(false);
    }
  };

  // Delete Material
  const handleDeleteMaterial = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài học "${title}"?`)) return;

    try {
      const res = await fetch(`/api/training?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xóa bài học');
      setMessage({ type: 'success', text: data.message });
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Helper file icon
  const getFileBadge = (type?: TrainingFileType, name?: string) => {
    switch (type) {
      case 'pdf':
        return (
          <span className="px-2 py-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 badge-nowrap">
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>PDF</span>
          </span>
        );
      case 'doc':
        return (
          <span className="px-2 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 badge-nowrap">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>WORD</span>
          </span>
        );
      case 'excel':
        return (
          <span className="px-2 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 badge-nowrap">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXCEL</span>
          </span>
        );
      case 'image':
        return (
          <span className="px-2 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 badge-nowrap">
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>HÌNH ẢNH</span>
          </span>
        );
      case 'video':
        return (
          <span className="px-2 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 badge-nowrap">
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>VIDEO</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center space-x-1 badge-nowrap">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>TÀI LIỆU</span>
          </span>
        );
    }
  };

  const getSectionTitle = (sec: TrainingSection) => {
    switch (sec) {
      case 'regulations':
        return 'Khối 1: Quy Định & Tác Phong';
      case 'operations':
        return 'Khối 2: Nghiệp Vụ Kỹ Thuật & POS';
      case 'promotions':
        return 'Khối 3: Bảng Giá & Khuyến Mãi';
      default:
        return 'Tài Liệu Đào Tạo';
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* 1. TOP HEADER & SUMMARY CARD */}
      <div className="bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide flex items-center space-x-2">
                <span>Hệ Thống Đào Tạo Nhân Viên & Onboarding</span>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold rounded-full border border-cyan-500/30">
                  TD Mobile 2026
                </span>
              </h2>
              <div className="text-xs text-slate-400 mt-0.5">
                Quy chuẩn 3 khối: Tác phong làm việc • Nghiệp vụ POS kỹ thuật • Bảng giá & khuyến mãi
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
            {isManagerOrAbove && (
              <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setViewMode('materials')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    viewMode === 'materials'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-glow-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Kho Bài Học</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('progress')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    viewMode === 'progress'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Tiến Độ Nhân Sự</span>
                </button>
              </div>
            )}

            {isManagerOrAbove && viewMode === 'materials' && (
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1.5 active:scale-95 badge-nowrap"
              >
                <Plus className="w-4 h-4 font-black" />
                <span>+ Thêm Tài Liệu Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Staff Personal Progress Bar */}
        <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/20">
              {myProgressPct}%
            </div>
            <div>
              <div className="font-bold text-white flex items-center space-x-2">
                <span>Tiến độ học tập của bạn:</span>
                <span className="text-emerald-400 font-extrabold">{myCompletedCount}/{myTotalCount} bài học đã hoàn thành</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {myCompletedCount === myTotalCount && myTotalCount > 0
                  ? '🎉 Xuất sắc! Bạn đã hoàn thành 100% tất cả tài liệu đào tạo bắt buộc!'
                  : 'Hãy mở đọc kỹ từng tài liệu và bấm "[Xác nhận đã đọc & hiểu]" để ghi nhận.'}
              </div>
            </div>
          </div>

          <div className="w-full sm:w-64 bg-slate-900 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-glow-cyan"
              style={{ width: `${Math.min(100, Math.max(0, myProgressPct))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. SECTION TABS & SEARCH BAR */}
      {viewMode === 'materials' && (
        <div className="space-y-3">
          {/* Section Filter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SECTION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              const count =
                tab.id === 'all'
                  ? materials.length
                  : materials.filter((m) => m.section === tab.id).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    isActive
                      ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/60 shadow-glow-cyan'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isActive ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-cyan-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 bg-slate-950 text-slate-300 text-[10px] font-bold rounded-md border border-slate-800 badge-nowrap">
                      {count} bài
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className={`text-xs font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {tab.label}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm bài học, quy trình test máy, bảng giá, file đính kèm..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT: MATERIALS LIST OR ADMIN PROGRESS REPORT */}
      {viewMode === 'materials' ? (
        <div>
          {loading ? (
            <div className="text-center py-16 text-xs text-slate-400 animate-pulse">
              Đang tải danh sách tài liệu đào tạo...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-12 text-center space-y-3">
              <FolderOpen className="w-10 h-10 mx-auto text-slate-600" />
              <div className="text-sm font-bold text-slate-300">Không tìm thấy bài học nào phù hợp.</div>
              {isManagerOrAbove && (
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-slate-700 transition"
                >
                  + Thêm bài học mới ngay
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((item) => {
                const isCompleted = item.is_completed === true;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                      isCompleted
                        ? 'border-emerald-500/40 shadow-glow-emerald/30'
                        : 'border-slate-800 hover:border-slate-700 shadow-xl'
                    }`}
                  >
                    {/* Top: Section badge, Mandatory badge & Actions */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="px-2.5 py-0.5 bg-slate-950 text-cyan-300 font-extrabold text-[10px] rounded-lg border border-cyan-500/30 uppercase badge-nowrap">
                            {getSectionTitle(item.section)}
                          </span>

                          {item.is_mandatory && (
                            <span className="px-2 py-0.5 bg-rose-500/15 text-rose-300 font-black text-[10px] rounded-lg border border-rose-500/30 uppercase badge-nowrap">
                              ● Bắt buộc
                            </span>
                          )}

                          {getFileBadge(item.file_type, item.file_name)}
                        </div>

                        {/* Edit / Delete (Admin / Manager only) */}
                        {isManagerOrAbove && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl transition"
                              title="Chỉnh sửa bài học"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(item.id, item.title)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition"
                              title="Xóa bài học"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1.5 cursor-pointer" onClick={() => setPreviewMaterial(item)}>
                        <h3 className="text-sm sm:text-base font-black text-white hover:text-cyan-300 transition tracking-tight">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* File / Video Banner Link */}
                      {(item.file_name || item.video_url || item.file_url) && (
                        <div
                          onClick={() => setPreviewMaterial(item)}
                          className="p-3 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-3 group transition"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {item.video_url ? (
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                                <PlayCircle className="w-4 h-4 text-amber-400" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-slate-800 text-cyan-300 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                                {item.file_name || (item.video_url ? 'Video bài giảng hướng dẫn' : 'Tài liệu hướng dẫn')}
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold">
                                {item.file_size ? `${item.file_size} • ` : ''}Bấm để xem nội dung chi tiết
                              </div>
                            </div>
                          </div>

                          <div className="p-1.5 bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-400 rounded-xl transition flex-shrink-0">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Action Confirmation Button */}
                    <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-1.5 text-[11px]">
                        {isCompleted ? (
                          <span className="text-emerald-400 font-bold flex items-center space-x-1 badge-nowrap">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Đã hoàn thành</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center space-x-1 badge-nowrap">
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>Chưa hoàn thành</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewMaterial(item)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleToggleComplete(item.id, isCompleted)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 badge-nowrap ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan'
                          }`}
                          title={isCompleted ? 'Bấm để hủy trạng thái hoàn thành' : 'Xác nhận bạn đã đọc và hiểu'}
                        >
                          {isCompleted ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>✓ Đã hiểu</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                              <span>[Xác nhận đã đọc & hiểu]</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 4. ADMIN & MANAGER VIEW: BÁO CÁO TIẾN ĐỘ ĐÀO TẠO CỦA NHÂN SỰ */
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
                <BadgePercent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                  Báo Cáo Tiến Độ Onboarding & Đào Tạo Nhân Viên
                </h3>
                <div className="text-xs text-slate-400">
                  Theo dõi tỷ lệ hoàn thành các bài học quy định & nghiệp vụ của từng nhân sự
                </div>
              </div>
            </div>

            <div className="text-xs font-bold text-cyan-300">
              Tổng số bài học chuẩn: <b className="text-white font-sans">{materials.length}</b> bài
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nhân Viên</th>
                  <th className="px-4 py-3">Chức Vụ & Hợp Đồng</th>
                  <th className="px-4 py-3">Đã Hoàn Thành</th>
                  <th className="px-4 py-3">Tiến Độ %</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Hoạt Động Gần Nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {userProgressList.map((prog) => {
                  const isFinishedAll = prog.completed_materials === prog.total_materials && prog.total_materials > 0;

                  return (
                    <tr key={prog.user_id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-black text-white text-sm">{prog.user_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-bold">@{prog.username}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-slate-950 text-amber-300 font-bold rounded-lg border border-slate-800 text-[11px] badge-nowrap">
                          {prog.user_role === 'admin'
                            ? 'Admin'
                            : prog.user_role === 'owner'
                            ? 'Chủ shop'
                            : prog.user_role === 'manager'
                            ? 'Quản lý'
                            : prog.contract_type === 'probation'
                            ? 'Thử việc (Học việc)'
                            : 'Nhân viên chính thức'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-bold font-sans text-sm text-white">
                        {prog.completed_materials} / {prog.total_materials} bài
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFinishedAll
                                  ? 'bg-emerald-400 shadow-glow-emerald'
                                  : 'bg-cyan-400 shadow-glow-cyan'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, prog.completion_percentage))}%` }}
                            />
                          </div>
                          <span className="font-black text-white font-sans text-xs">{prog.completion_percentage}%</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black badge-nowrap ${
                            isFinishedAll
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : prog.completed_materials > 0
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isFinishedAll
                            ? '✓ Đạt chuẩn Onboarding'
                            : prog.completed_materials > 0
                            ? '⏳ Đang học'
                            : 'Chưa bắt đầu'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-sans text-slate-400 text-xs">
                        {prog.last_activity
                          ? new Date(prog.last_activity).toLocaleDateString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : 'Chưa có hoạt động'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: PREVIEW / CHI TIẾT BÀI HỌC & XEM FILE / VIDEO  */}
      {/* ======================================================== */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-cyan-400 font-extrabold uppercase">
                    {getSectionTitle(previewMaterial.section)}
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {previewMaterial.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Description */}
              {previewMaterial.description && (
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-slate-200 leading-relaxed font-semibold">
                  {previewMaterial.description}
                </div>
              )}

              {/* Video Player / Embed */}
              {previewMaterial.video_url && (
                <div className="space-y-2">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center space-x-1.5">
                    <Video className="w-4 h-4 text-amber-400" />
                    <span>Video Bài Giảng / Video Hướng Dẫn</span>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                    {previewMaterial.video_url.includes('youtube.com') || previewMaterial.video_url.includes('youtu.be') ? (
                      <iframe
                        src={previewMaterial.video_url.replace('watch?v=', 'embed/')}
                        title="Training Video"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : (
                      <video src={previewMaterial.video_url} controls className="w-full h-full object-contain" />
                    )}
                  </div>
                </div>
              )}

              {/* Detailed Content / Rules / Checklists */}
              {previewMaterial.content && (
                <div className="space-y-2">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Nội Dung Chi Tiết / Quy Trình Thực Hiện</span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                    {previewMaterial.content}
                  </div>
                </div>
              )}

              {/* Attached File Download & View */}
              {previewMaterial.file_url && (
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-slate-800 text-cyan-400 rounded-xl flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-white text-xs truncate">
                        {previewMaterial.file_name || 'Tài liệu đính kèm'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Định dạng: {previewMaterial.file_type?.toUpperCase()} {previewMaterial.file_size ? `• ${previewMaterial.file_size}` : ''}
                      </div>
                    </div>
                  </div>

                  <a
                    href={previewMaterial.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewMaterial.file_name || 'tai_lieu_dao_tao'}
                    className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1 shadow-glow-cyan transition flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Về / Mở File</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                Đóng lại
              </button>

              <button
                type="button"
                onClick={() => {
                  handleToggleComplete(previewMaterial.id, previewMaterial.is_completed);
                  setPreviewMaterial((prev) => prev ? { ...prev, is_completed: !prev.is_completed } : null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-md ${
                  previewMaterial.is_completed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan'
                }`}
              >
                {previewMaterial.is_completed ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>✓ Đã xác nhận hiểu (Bấm để hủy)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>[Xác nhận đã đọc & hiểu]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: THÊM MỚI / CHỈNH SỬA TÀI LIỆU (ADMIN / MANAGER) */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  {editingMaterial ? 'Chỉnh Sửa Bài Học Đào Tạo' : 'Thêm Bài Học / Tài Liệu Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaterialSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
              {/* Select Block */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Thuộc Khối Nội Dung *</label>
                <select
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value as TrainingSection)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="regulations">Khối 1: Quy Định & Tác Phong Làm Việc</option>
                  <option value="operations">Khối 2: Nghiệp Vụ Kỹ Thuật & Thao Tác POS</option>
                  <option value="promotions">Khối 3: Chương Trình Đang Chạy (Bảng Giá & Ưu Đãi)</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Tiêu Đề Bài Học *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="VD: Quy trình tiếp đón khách hàng & bàn giao ca"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Tóm Tắt Ngắn</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="VD: Tóm tắt nội quy trang phục, giờ giấc và nụ cười chào đón"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Detailed Content */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Nội Dung Chi Tiết / Quy Chuẩn Bước Thực Hiện</label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Nhập chi tiết từng bước: 1. Đứng dậy chào khách, 2. Mời nước, 3. Hỏi nhu cầu..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* File Attachment Options */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white uppercase text-[11px]">Tệp Đính Kèm (PDF, DOC, EXCEL, ẢNH, VIDEO)</span>
                  <select
                    value={formFileType}
                    onChange={(e) => setFormFileType(e.target.value as TrainingFileType)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-bold text-cyan-300"
                  >
                    <option value="pdf">PDF</option>
                    <option value="doc">WORD (DOC/DOCX)</option>
                    <option value="excel">EXCEL (XLSX)</option>
                    <option value="image">HÌNH ẢNH (PNG/JPG)</option>
                    <option value="video">VIDEO (MP4)</option>
                    <option value="link">ĐƯỜNG LINK / TÀI LIỆU</option>
                    <option value="none">Không có file</option>
                  </select>
                </div>

                {/* Upload from PC/Phone */}
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold mb-1">
                    Chọn tệp từ máy tính / điện thoại:
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                  />
                  {formFileName && (
                    <div className="text-[10px] text-emerald-400 font-bold mt-1">
                      Đã chọn: {formFileName} ({formFileSize})
                    </div>
                  )}
                </div>

                {/* Direct Link URL */}
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold mb-1">
                    Hoặc dán Link URL file / Google Drive / Ảnh online:
                  </label>
                  <input
                    type="url"
                    value={formFileUrl}
                    onChange={(e) => setFormFileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Video URL (YouTube / Video Link) */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Link Video YouTube / MP4 (Nếu có)</label>
                <input
                  type="url"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Mandatory toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="mandatory"
                  checked={formIsMandatory}
                  onChange={(e) => setFormIsMandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700"
                />
                <label htmlFor="mandatory" className="text-white font-bold cursor-pointer">
                  Bài học bắt buộc (Tính vào tiến độ Onboarding 100%)
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-glow-cyan transition active:scale-95 disabled:opacity-50"
                >
                  {savingForm ? 'Đang lưu...' : editingMaterial ? 'Lưu Thay Đổi' : 'Tạo Bài Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
