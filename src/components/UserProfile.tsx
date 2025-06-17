import React, { useState } from 'react';
import { User, Shield, Settings, LogOut, Edit3, Save, X, Star, Award } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, profile, signOut, updateUserProfile, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    area_of_interest: profile?.area_of_interest || '',
    notification_radius: profile?.notification_radius || 1000,
    language_preference: profile?.language_preference || 'en',
    emergency_contact: profile?.emergency_contact || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleSaveProfile = async () => {
    setIsUpdating(true);
    try {
      await updateUserProfile(editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      area_of_interest: profile?.area_of_interest || '',
      notification_radius: profile?.notification_radius || 1000,
      language_preference: profile?.language_preference || 'en',
      emergency_contact: profile?.emergency_contact || ''
    });
    setIsEditing(false);
  };

  const getReputationLevel = (score: number) => {
    if (score >= 1000) return { level: 'Community Champion', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (score >= 500) return { level: 'Safety Leader', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 200) return { level: 'Active Member', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 50) return { level: 'Contributor', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { level: 'New Member', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const reputationInfo = profile ? getReputationLevel(profile.reputation_score) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Profile</h2>
              <p className="text-sm text-gray-600">
                {isAuthenticated ? 'Manage your account' : 'Anonymous User'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isAuthenticated && profile ? (
            <>
              {/* User Info */}
              <div className="text-center">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Community Member</h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>

              {/* Reputation */}
              {reputationInfo && (
                <div className={`p-4 rounded-xl ${reputationInfo.bg} border`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-semibold ${reputationInfo.color}`}>
                        {reputationInfo.level}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {profile.reputation_score} reputation points
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className={`w-6 h-6 ${reputationInfo.color}`} />
                      <Award className={`w-6 h-6 ${reputationInfo.color}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Settings</h4>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="text-sm">Edit</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span className="text-sm">Save</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm">Cancel</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Area of Interest
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.area_of_interest}
                        onChange={(e) => setEditForm({ ...editForm, area_of_interest: e.target.value })}
                        placeholder="e.g., Extension 8, Shopping Centre"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-600 p-3 bg-gray-50 rounded-lg">
                        {profile.area_of_interest || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Radius
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.notification_radius}
                        onChange={(e) => setEditForm({ ...editForm, notification_radius: parseInt(e.target.value) })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={500}>500m - Immediate area</option>
                        <option value={1000}>1km - Neighborhood</option>
                        <option value={2000}>2km - Extended area</option>
                        <option value={5000}>5km - Wider community</option>
                      </select>
                    ) : (
                      <p className="text-gray-600 p-3 bg-gray-50 rounded-lg">
                        {profile.notification_radius}m radius
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language Preference
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.language_preference}
                        onChange={(e) => setEditForm({ ...editForm, language_preference: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="af">Afrikaans</option>
                        <option value="zu">Zulu</option>
                        <option value="st">Sotho</option>
                      </select>
                    ) : (
                      <p className="text-gray-600 p-3 bg-gray-50 rounded-lg">
                        {profile.language_preference === 'en' && 'English'}
                        {profile.language_preference === 'af' && 'Afrikaans'}
                        {profile.language_preference === 'zu' && 'Zulu'}
                        {profile.language_preference === 'st' && 'Sotho'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.emergency_contact}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                        placeholder="Emergency contact number"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-600 p-3 bg-gray-50 rounded-lg">
                        {profile.emergency_contact || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900">Privacy Protected</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      Your reports remain anonymous. Personal information is never shared with the community.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Anonymous User</h3>
              <p className="text-gray-600 mb-6">
                You're using SafeGuard anonymously. Sign up to unlock community features and build your reputation.
              </p>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900">Anonymous Reporting</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      You can still report incidents and access safety information without an account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;