"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, User, Camera, Loader2, Check, X } from "lucide-react";

import { useWallet } from "@/context/WalletContext";
import AddressAvatar from "@/components/AddressAvatar";

interface UserProfile {
  id: string;
  address: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  postsCount: number;
  discussionsCount: number;
  likesReceived: number;
  trustLevel: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export default function ProfilePage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isConnected,
    address,
    signMessage,
    onConnectModalOpenChange,
  } = useWallet();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch existing profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["profile", address],
    queryFn: async () => {
      if (!address) throw new Error("No address");
      const res = await fetch(`/api/profile?address=${address}`);
      if (!res.ok && res.status !== 200) {
        // Return null for any error, let the UI handle it gracefully
        return null;
      }
      const data = await res.json();
      // Handle the case where id is null (new user or DB unavailable)
      if (!data.id) {
        return null;
      }
      return data;
    },
    enabled: !!address && isConnected,
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
      setAvatarPreview(profile.avatarUrl);
    }
  }, [profile]);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      onConnectModalOpenChange(true);
    }
  }, [isConnected, onConnectModalOpenChange]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setSaveError("Please upload a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSaveError("Image must be less than 2MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!address) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      let avatarUrl = avatarPreview;

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("address", address);

        const uploadRes = await fetch("/api/profile/avatar", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const error = await uploadRes.json();
          throw new Error(error.error || "Failed to upload avatar");
        }

        const { url } = await uploadRes.json();
        avatarUrl = url;
      }

      // Update profile
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          displayName: displayName || null,
          bio: bio || null,
          avatarUrl,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save profile");
      }

      setSaveSuccess(true);
      setAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: ["profile", address] });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!address || !signMessage) return;

    setIsVerifying(true);
    setSaveError(null);

    try {
      // Create verification message
      const timestamp = Date.now();
      const message = `Verify ownership of ${address} for alkanes.build forum\nTimestamp: ${timestamp}`;

      // Sign the message
      const signature = await signMessage(message);

      // Send to backend for verification
      const res = await fetch("/api/profile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          message,
          signature,
          timestamp,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Verification failed");
      }

      queryClient.invalidateQueries({ queryKey: ["profile", address] });
    } catch (err) {
      console.error("Verification error:", err);
      setSaveError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[color:var(--sf-muted)] mb-4">Please connect your wallet to continue</p>
          <button
            onClick={() => onConnectModalOpenChange(true)}
            className="btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--sf-text)]">Profile</h1>
            <p className="text-sm text-[color:var(--sf-muted)]">
              Customize how you appear in the forum
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[color:var(--sf-text)] text-[color:var(--sf-bg-start)] text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Status messages */}
        {saveError && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 text-[13px] text-red-400">
            <X size={14} className="flex-shrink-0" />
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-green-500/10 text-[13px] text-green-400">
            <Check size={14} className="flex-shrink-0" />
            Profile saved successfully!
          </div>
        )}

        {profileLoading ? (
          <div className="glass-card overflow-hidden" style={{ background: "#101010" }}>
            <div className="bg-[color:var(--sf-surface)] min-h-[300px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[color:var(--sf-muted)]" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Avatar + Identity Card */}
            <div className="glass-card overflow-hidden" style={{ background: "#101010" }}>
              <div className="bg-[color:var(--sf-surface)]">
                <div className="px-5 py-5 flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-white/[0.06]"
                      />
                    ) : (
                      <AddressAvatar address={address} size={80} className="ring-2 ring-white/[0.06]" />
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors"
                    >
                      <Camera size={12} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[color:var(--sf-muted)] mb-1">
                      Square image, at least 200x200px. Max 2MB.
                    </p>
                    {avatarPreview && avatarPreview !== profile?.avatarUrl && (
                      <button
                        onClick={() => {
                          setAvatarPreview(profile?.avatarUrl || null);
                          setAvatarFile(null);
                        }}
                        className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
                      >
                        Remove new avatar
                      </button>
                    )}
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="px-5 py-4 border-t border-[color:var(--sf-outline)] flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-[color:var(--sf-muted)] uppercase tracking-wider mb-1">Address</div>
                    <div className="font-mono text-xs text-[color:var(--sf-text)] truncate">{address}</div>
                  </div>
                  {profile?.verified ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium flex-shrink-0">
                      <Check size={10} /> Verified
                    </span>
                  ) : (
                    <button
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="text-[11px] text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors border border-[color:var(--sf-outline)] rounded-lg px-2.5 py-1 flex-shrink-0 disabled:opacity-50"
                    >
                      {isVerifying ? <Loader2 size={10} className="animate-spin" /> : "Verify"}
                    </button>
                  )}
                </div>
                {/* Display Name */}
                <div className="px-5 py-4 border-t border-[color:var(--sf-outline)]">
                  <label className="block text-[11px] text-[color:var(--sf-muted)] uppercase tracking-wider mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    placeholder="Enter a display name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/[0.04] text-[color:var(--sf-text)] text-[15px] outline-none focus:border-white/[0.08] transition-colors placeholder:text-[color:var(--sf-muted)]/40"
                  />
                </div>

                {/* Bio */}
                <div className="px-5 py-4 border-t border-[color:var(--sf-outline)]">
                  <label className="block text-[11px] text-[color:var(--sf-muted)] uppercase tracking-wider mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Tell us about yourself..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/[0.04] text-[color:var(--sf-text)] text-[15px] outline-none focus:border-white/[0.08] transition-colors resize-none placeholder:text-[color:var(--sf-muted)]/40"
                  />
                  <p className="text-[11px] text-[color:var(--sf-muted)] mt-1.5">{bio.length}/500</p>
                </div>
              </div>

              {/* Stats footer */}
              {profile && (
                <div className="grid grid-cols-4 divide-x divide-[color:var(--sf-outline)]">
                  {[
                    { value: profile.postsCount, label: "Posts" },
                    { value: profile.discussionsCount, label: "Topics" },
                    { value: profile.likesReceived, label: "Likes" },
                    { value: profile.trustLevel, label: "Trust" },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center py-3">
                      <div className="text-sm font-bold text-[color:var(--sf-text)] tabular-nums">{value}</div>
                      <div className="text-[10px] text-[color:var(--sf-muted)] uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
    </main>
  );
}
