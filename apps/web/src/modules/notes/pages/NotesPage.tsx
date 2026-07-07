import { useState, useEffect } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { formatDate } from '@/modules/shared/utils/formatters';
import { BookOpen, Plus, X, Edit2, Trash2, Save } from 'lucide-react';

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, noteFormDraft, setNoteFormDraft } = useData();
  const { confirm } = useDialog();

  const [showForm, setShowForm] = useState(() => {
    if (noteFormDraft) return noteFormDraft.showForm;
    return false;
  });

  const [editId, setEditId] = useState(() => {
    if (noteFormDraft) return noteFormDraft.editId;
    return null;
  });

  const [form, setForm] = useState(() => {
    if (noteFormDraft) return noteFormDraft.form;
    return { title: '', content: '', tags: '' };
  });

  useEffect(() => {
    setNoteFormDraft({ form, showForm, editId });
  }, [form, showForm, editId, setNoteFormDraft]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCancelOrToggle = () => {
    if (showForm) {
      setShowForm(false);
      setEditId(null);
      setForm({ title: '', content: '', tags: '' });
      setNoteFormDraft(null);
    } else {
      setShowForm(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    const data = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    if (editId) {
      updateNote(editId, data);
      setEditId(null);
    } else {
      addNote(data);
    }
    setForm({ title: '', content: '', tags: '' });
    setShowForm(false);
    setNoteFormDraft(null);
  };

  const handleEdit = (note: any) => {
    setForm({
      title: note.title,
      content: note.content,
      tags: note.tags ? note.tags.join(', ') : '',
    });
    setEditId(note.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm('Apakah Anda yakin ingin menghapus catatan ini?', {
      title: 'Hapus Catatan',
      severity: 'danger',
      confirmText: 'Hapus'
    });
    if (isConfirmed) {
      deleteNote(id);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="page-title">Catatan Trading</h1>
            <p className="page-subtitle">Jurnal harian dan catatan market</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCancelOrToggle}>
          {showForm ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={16} />
              Batal
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              Tulis Catatan
            </span>
          )}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Judul *</label>
                <input
                  className="form-input"
                  placeholder="Contoh: Review Market Hari Ini"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Isi Catatan *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tuliskan catatan tentang kondisi market, rencana trading, lessons learned..."
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  style={{ minHeight: 150 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (pisah dengan koma)</label>
                <input
                  className="form-input"
                  placeholder="IHSG, review, plan"
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} />
                  {editId ? 'Update Catatan' : 'Simpan Catatan'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <BookOpen size={48} />
          </div>
          <div className="empty-state-title">Belum ada catatan</div>
          <div className="empty-state-desc">Tulis catatan harian tentang kondisi market dan rencana trading</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {notes.map(note => (
            <div key={note.id} className="card" style={{ transition: 'all 0.2s' }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title">{note.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatDate(note.createdAt)}
                    {note.updatedAt && ` · Diperbarui ${formatDate(note.updatedAt)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(note)} aria-label="Edit catatan">
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm text-loss" onClick={() => handleDelete(note.id)} aria-label="Hapus catatan">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                  {note.content}
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
                    {note.tags.map(tag => (
                      <span key={tag} className="badge badge-blue">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
