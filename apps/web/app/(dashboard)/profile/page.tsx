'use client';

import { Eye, EyeOff, KeyRound, Loader2, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/useAuthStore';

export default function ProfilePage() {
  const utils = trpc.useUtils();
  const updateTokens = useAuthStore((state) => state.updateTokens);

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Feedback State
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // tRPC Queries & Mutations
  const { data: meData, isLoading: meLoading } = trpc.auth.me.useQuery();

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      setProfileSuccess('Profile updated successfully!');
      setProfileError('');
      utils.auth.me.invalidate();
      setTimeout(() => setProfileSuccess(''), 3000);
    },
    onError: (err) => {
      setProfileError(err.message);
      setProfileSuccess('');
    },
  });

  const updatePasswordMutation = trpc.auth.updatePassword.useMutation({
    onSuccess: (data) => {
      // Save the new access token
      if (data.accessToken) {
        updateTokens(data.accessToken);
      }
      setPasswordSuccess('Password updated successfully!');
      setPasswordError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      setPasswordError(err.message);
      setPasswordSuccess('');
    },
  });

  // Initialize form with existing data
  useEffect(() => {
    if (meData) {
      // Use saved values if available, otherwise fallback to defaults
      setAvatarSeed(meData.avatarSeed || meData.email || '');
      setDisplayName(
        meData.displayName || meData.coachProfile?.name || meData.email?.split('@')[0] || ''
      );
      if (meData.coachProfile) {
        setBio(meData.coachProfile.bio || '');
      }
    }
  }, [meData]);

  const handleProfileSave = () => {
    setProfileError('');
    setProfileSuccess('');

    updateProfileMutation.mutate({
      displayName: displayName || undefined,
      avatarSeed: avatarSeed || undefined,
      bio: meData?.role === 'COACH' ? bio : undefined,
    });
  };

  const handlePasswordUpdate = () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (meLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your display name and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                alt={displayName}
              />
              <AvatarFallback className="text-2xl">
                {displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium">{meData?.email}</p>
              <p className="text-xs text-muted-foreground">Role: {meData?.role}</p>
            </div>
          </div>

          <Separator />

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>

          {/* Bio (for Coaches) */}
          {meData?.role === 'COACH' && (
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
          )}

          {/* Avatar Seed */}
          <div className="space-y-2">
            <Label htmlFor="avatarSeed">Avatar Seed</Label>
            <Input
              id="avatarSeed"
              value={avatarSeed}
              onChange={(e) => setAvatarSeed(e.target.value)}
              placeholder="Change this to get a different avatar"
            />
            <p className="text-xs text-muted-foreground">
              Enter any text to generate a unique avatar.
            </p>
          </div>

          {/* Feedback */}
          {profileSuccess && <p className="text-sm text-green-600">{profileSuccess}</p>}
          {profileError && <p className="text-sm text-red-600">{profileError}</p>}

          <Button
            onClick={handleProfileSave}
            disabled={updateProfileMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password using your current password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          {/* Feedback */}
          {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

          <Button
            onClick={handlePasswordUpdate}
            disabled={updatePasswordMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updatePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
