'use client';

import { useState } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';

interface ContactFormProps {
  leagueId: string;
  leagueEmail?: string;
}

export function ContactForm({ leagueId, leagueEmail }: ContactFormProps) {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');

    // For now, if there's a league email, open mailto
    // In a future version, this would call an API endpoint
    if (leagueEmail) {
      const subject = encodeURIComponent(formData.subject || 'Contact Form Submission');
      const body = encodeURIComponent(
        `From: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
      );
      window.location.href = `mailto:${leagueEmail}?subject=${subject}&body=${body}`;
      setFormState('success');
      return;
    }

    // Simulate API call for demonstration
    // TODO: Replace with actual API endpoint when edge function is created
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setFormState('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setFormState('error');
    }
  };

  if (formState === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Message Sent!</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Thank you for reaching out. We'll get back to you soon.
        </p>
        <button
          onClick={() => setFormState('idle')}
          className="text-[var(--league-primary)] hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formState === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Failed to send message. Please try again or email directly.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="
              w-full px-4 py-2.5 rounded-lg
              bg-[var(--color-surface-hover)] border border-[var(--color-border)]
              text-[var(--color-text-primary)]
              focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
              transition-all duration-200
            "
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="
              w-full px-4 py-2.5 rounded-lg
              bg-[var(--color-surface-hover)] border border-[var(--color-border)]
              text-[var(--color-text-primary)]
              focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
              transition-all duration-200
            "
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium mb-1.5">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="
            w-full px-4 py-2.5 rounded-lg
            bg-[var(--color-surface-hover)] border border-[var(--color-border)]
            text-[var(--color-text-primary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
            transition-all duration-200
          "
          placeholder="What is this regarding?"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1.5">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="
            w-full px-4 py-2.5 rounded-lg resize-none
            bg-[var(--color-surface-hover)] border border-[var(--color-border)]
            text-[var(--color-text-primary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
            transition-all duration-200
          "
          placeholder="How can we help you?"
        />
      </div>

      <button
        type="submit"
        disabled={formState === 'submitting'}
        className="
          w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg
          bg-[var(--league-primary)] text-[var(--color-background)] font-semibold
          hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        "
      >
        {formState === 'submitting' ? (
          <>
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Message
          </>
        )}
      </button>

      <p className="text-xs text-[var(--color-text-muted)] text-center">
        By submitting this form, you agree to our privacy policy.
      </p>
    </form>
  );
}
