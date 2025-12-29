import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useGoals } from '../contexts/GoalsContext';
import { motion } from 'motion/react';
import { Leaf, Mail, AlertCircle } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

const DIETARY_RESTRICTIONS = [
  { key: 'halal', label: 'Halal', description: 'Islamic dietary laws' },
  { key: 'kosher', label: 'Kosher', description: 'Jewish dietary laws' },
  { key: 'vegetarian', label: 'Vegetarian', description: 'No meat' },
  { key: 'vegan', label: 'Vegan', description: 'No animal products' },
  { key: 'gluten_free', label: 'Gluten-Free', description: 'No gluten' },
  { key: 'dairy_free', label: 'Dairy-Free', description: 'No dairy products' },
  { key: 'nut_free', label: 'Nut-Free', description: 'No nuts' },
  { key: 'shellfish_free', label: 'Shellfish-Free', description: 'No shellfish' },
  { key: 'low_sodium', label: 'Low Sodium', description: 'Reduced salt' },
  { key: 'low_carb', label: 'Low Carb', description: 'Low carbohydrate' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { updateGoals } = useGoals();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({
    age: '', gender: 'male', height: '', weight: '', activity_level: 'moderately_active', goal_type: 'maintain'
  });
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [calculatedGoals, setCalculatedGoals] = useState(null);
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [bmi, setBmi] = useState(null);
  const [bmiCategory, setBmiCategory] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'dietary'
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data } = await supabase.from('user_profile').select('*').eq('user_id', user.id).single();
      if (data) {
        // Ensure we have a valid activity level
        const validActivityLevels = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
        const activityLevel = (data.activity_level && validActivityLevels.includes(data.activity_level)) 
          ? data.activity_level 
          : 'moderately_active';
        
        setProfile({
          age: data.age || '', 
          gender: data.gender || 'male',
          height: data.height_cm || '', 
          weight: data.weight_kg || '',
          activity_level: activityLevel, 
          goal_type: data.goal_type || 'maintain'
        });
        setDietaryRestrictions(data.dietary_restrictions || []);
        setHeightUnit('cm');
        setWeightUnit('kg');
        if (data.bmi) setBmi(data.bmi);
        if (data.bmi_category) setBmiCategory(data.bmi_category);
      }
    }
    setLoading(false);
  };

  const toggleRestriction = (key) => {
    setDietaryRestrictions(prev => 
      prev.includes(key) 
        ? prev.filter(r => r !== key)
        : [...prev, key]
    );
  };

  // Handle height unit conversion
  const handleHeightUnitChange = (newUnit) => {
    if (newUnit === heightUnit) return;
    
    const currentValue = parseFloat(profile.height);
    if (!isNaN(currentValue) && currentValue > 0) {
      if (newUnit === 'ft') {
        const totalInches = currentValue / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        setProfile({ ...profile, height: `${feet}'${inches}` });
      } else {
        const [feet, inches] = profile.height.split("'").map(s => parseFloat(s) || 0);
        const cm = Math.round((feet * 30.48) + (inches * 2.54));
        setProfile({ ...profile, height: cm.toString() });
      }
    }
    setHeightUnit(newUnit);
  };

  // Handle weight unit conversion
  const handleWeightUnitChange = (newUnit) => {
    if (newUnit === weightUnit) return;
    
    const currentValue = parseFloat(profile.weight);
    if (!isNaN(currentValue) && currentValue > 0) {
      if (newUnit === 'lbs') {
        const lbs = Math.round(currentValue * 2.20462 * 10) / 10;
        setProfile({ ...profile, weight: lbs.toString() });
      } else {
        const kg = Math.round(currentValue * 0.453592 * 10) / 10;
        setProfile({ ...profile, weight: kg.toString() });
      }
    }
    setWeightUnit(newUnit);
  };

  const calculateGoals = () => {
    let heightCm = parseFloat(profile.height);
    let weightKg = parseFloat(profile.weight);

    if (heightUnit === 'ft') {
      const [feet, inches] = profile.height.split("'").map(s => parseFloat(s) || 0);
      heightCm = (feet * 30.48) + (inches * 2.54);
    }
    if (weightUnit === 'lbs') weightKg = weightKg * 0.453592;

    if (!profile.age || !heightCm || !weightKg) {
      setMessage({ type: 'error', text: 'Please fill in age, height, and weight to calculate goals' });
      return;
    }

    let bmr;
    if (profile.gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9
    };
    let tdee = bmr * (activityMultipliers[profile.activity_level] || 1.55);

    const goalAdjustments = {
      lose: tdee - 500, maintain: tdee, gain: tdee + 300
    };
    const calories = Math.round(goalAdjustments[profile.goal_type]);

    const proteinMultiplier = profile.goal_type === 'gain' ? 2.2 : profile.goal_type === 'lose' ? 2.0 : 1.8;
    const protein = Math.round(weightKg * proteinMultiplier);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
    const fiber = Math.round(calories / 1000 * 14);

    const heightM = heightCm / 100;
    const calculatedBmi = weightKg / (heightM * heightM);
    setBmi(calculatedBmi.toFixed(1));
    
    let category = '';
    if (calculatedBmi < 18.5) category = 'Underweight';
    else if (calculatedBmi < 25) category = 'Normal';
    else if (calculatedBmi < 30) category = 'Overweight';
    else category = 'Obese';
    setBmiCategory(category);

    setCalculatedGoals({ calories, protein, carbs, fat, fiber });
    setMessage({ type: 'success', text: 'Goals calculated successfully!' });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let heightCm = parseFloat(profile.height);
      let weightKg = parseFloat(profile.weight);

      if (heightUnit === 'ft') {
        const [feet, inches] = profile.height.split("'").map(s => parseFloat(s) || 0);
        heightCm = (feet * 30.48) + (inches * 2.54);
      }
      if (weightUnit === 'lbs') weightKg = weightKg * 0.453592;

      const profileData = {
        user_id: user.id, 
        age: parseInt(profile.age) || null, 
        gender: profile.gender || 'male',
        height_cm: heightCm || null, 
        weight_kg: weightKg || null,
        activity_level: profile.activity_level || 'moderately_active', 
        goal_type: profile.goal_type || 'maintain',
        dietary_restrictions: dietaryRestrictions || [],
        bmi: bmi ? parseFloat(bmi) : null, 
        bmi_category: bmiCategory || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('user_profile').upsert(profileData, { onConflict: 'user_id' });
      
      if (error) throw error;

      if (weightKg > 0) {
        await supabase.from('weight_history').upsert({
          user_id: user.id,
          weight_kg: weightKg,
          bmi: bmi ? parseFloat(bmi) : null,
          bmi_category: bmiCategory || null,
          recorded_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,recorded_at',
          ignoreDuplicates: false 
        });
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await fetchUser();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyGoals = async () => {
    if (calculatedGoals) {
      await updateGoals({ ...calculatedGoals, fiber: calculatedGoals.fiber || 30 });
      await handleSaveProfile();
      setMessage({ type: 'success', text: 'Goals applied and profile saved!' });
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      setShowPasswordPopup(true);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }
    
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/change-email` }
      );
      
      if (error) throw error;
      setShowEmailPopup(true);
      setNewEmail('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setMessage({ type: 'error', text: 'Please type DELETE to confirm' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call backend API to delete account
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://nutrisync-backend.onrender.com';
      const response = await fetch(`${backendUrl}/api/user/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete account');
      }

      // Sign out after successful deletion
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete account. Please contact support.' });
      console.error('Delete account error:', error);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const getBmiColor = () => {
    if (!bmiCategory) return 'text-white/60';
    if (bmiCategory === 'Normal') return 'text-primary-500';
    if (bmiCategory === 'Underweight') return 'text-secondary-400';
    return 'text-amber-400';
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60">Loading profile...</div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-heading font-bold text-white">
            Profile Settings
          </motion.h1>
          <p className="text-white/50 mt-1">Manage your account and preferences</p>
        </div>

        {/* Message */}
        {message.text && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-4  ${message.type === 'success' ? 'bg-primary-700/10 border border-primary-700/30 text-primary-500' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {message.text}
          </motion.div>
        )}

        {/* Account Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-heading font-semibold text-white">Account</h2>
            <p className="text-white/50 text-sm">{user?.email}</p>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2  font-medium transition ${
              activeTab === 'profile' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => setActiveTab('dietary')}
            className={`flex items-center gap-2 px-4 py-2  font-medium transition ${
              activeTab === 'dietary' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Leaf size={16} />
            Dietary
            {dietaryRestrictions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20  text-xs">{dietaryRestrictions.length}</span>
            )}
          </button>
        </div>

        {activeTab === 'profile' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
            <div className="mb-6">
              <h2 className="text-lg font-heading font-semibold text-white">Personal Details</h2>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Age</label>
                  <input type="number" min="0" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} className="input" placeholder="25" />
                </div>
                <div>
                  <label className="input-label">Gender</label>
                  <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="input">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Height */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/70">Height</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleHeightUnitChange('cm')} 
                      className={`px-3 py-1  text-xs font-medium transition ${heightUnit === 'cm' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      cm
                    </button>
                    <button 
                      onClick={() => handleHeightUnitChange('ft')} 
                      className={`px-3 py-1  text-xs font-medium transition ${heightUnit === 'ft' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      ft
                    </button>
                  </div>
                </div>
                <input 
                  type="text" 
                  value={profile.height} 
                  onChange={(e) => setProfile({ ...profile, height: e.target.value })} 
                  className="input"
                  placeholder={heightUnit === 'cm' ? '175' : "5'10"} 
                />
              </div>

              {/* Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/70">Weight</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleWeightUnitChange('kg')} 
                      className={`px-3 py-1  text-xs font-medium transition ${weightUnit === 'kg' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      kg
                    </button>
                    <button 
                      onClick={() => handleWeightUnitChange('lbs')} 
                      className={`px-3 py-1  text-xs font-medium transition ${weightUnit === 'lbs' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      lbs
                    </button>
                  </div>
                </div>
                <input 
                  type="number" 
                  min="0" 
                  step="0.1"
                  value={profile.weight} 
                  onChange={(e) => setProfile({ ...profile, weight: e.target.value })} 
                  className="input"
                  placeholder={weightUnit === 'kg' ? '70' : '154'} 
                />
              </div>

              {/* Activity Level */}
              <div>
                <label className="input-label">Activity Level</label>
                <select 
                  value={profile.activity_level} 
                  onChange={(e) => setProfile({ ...profile, activity_level: e.target.value })} 
                  className="input"
                >
                  <option value="sedentary">Sedentary (little exercise)</option>
                  <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                  <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                  <option value="very_active">Very Active (6-7 days/week)</option>
                  <option value="extra_active">Extra Active (athlete)</option>
                </select>
              </div>

              {/* Goal Type */}
              <div>
                <label className="input-label">Goal</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ key: 'lose', label: 'Lose Weight' }, { key: 'maintain', label: 'Maintain' }, { key: 'gain', label: 'Build Muscle' }].map(({ key, label }) => (
                    <button key={key} onClick={() => setProfile({ ...profile, goal_type: key })}
                      className={`py-3 px-4  text-sm font-medium transition ${profile.goal_type === key ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate Button */}
              <button onClick={calculateGoals} className="btn-primary w-full py-3">
                Calculate Goals
              </button>

              {/* BMI Display */}
              {bmi && (
                <div className="card p-4 border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/50 text-sm">BMI</p>
                      <p className={`text-2xl font-mono font-bold ${getBmiColor()}`}>{bmi}</p>
                    </div>
                    <span className={`px-3 py-1  text-xs font-medium ${
                      bmiCategory === 'Normal' ? 'bg-primary-700/20 text-primary-500' : 
                      bmiCategory === 'Underweight' ? 'bg-secondary-500/20 text-secondary-400' : 
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {bmiCategory}
                    </span>
                  </div>
                </div>
              )}

              {/* Calculated Goals */}
              {calculatedGoals && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 border-primary-700/30 bg-primary-700/5">
                  <h3 className="font-medium text-white mb-4">Recommended Daily Goals</h3>
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-mono font-bold text-primary-500">{calculatedGoals.calories}</p>
                      <p className="text-white/50 text-xs">Calories</p>
                    </div>
                    <div>
                      <p className="text-2xl font-mono font-bold text-secondary-400">{calculatedGoals.protein}g</p>
                      <p className="text-white/50 text-xs">Protein</p>
                    </div>
                    <div>
                      <p className="text-2xl font-mono font-bold text-amber-400">{calculatedGoals.carbs}g</p>
                      <p className="text-white/50 text-xs">Carbs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-mono font-bold text-purple-400">{calculatedGoals.fat}g</p>
                      <p className="text-white/50 text-xs">Fat</p>
                    </div>
                    <div>
                      <p className="text-2xl font-mono font-bold text-green-400">{calculatedGoals.fiber}g</p>
                      <p className="text-white/50 text-xs">Fiber</p>
                    </div>
                  </div>
                  <button onClick={handleApplyGoals} disabled={saving} className="btn-primary w-full mt-4">
                    Apply These Goals
                  </button>
                </motion.div>
              )}

              {/* Save Button */}
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            {/* Password & Email Management */}
            <div className="mt-6 p-6 border-t border-white/10 space-y-6">
              {/* Reset Password */}
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-heading font-semibold text-white">Password</h2>
                  <p className="text-sm text-white/50 mt-1">Reset your password via email</p>
                </div>
                <button onClick={handleResetPassword} disabled={saving} className="btn-outline w-full">
                  {saving ? 'Sending...' : 'Send Password Reset Email'}
                </button>
              </div>

              {/* Change Email */}
              <div className="pt-6 border-t border-white/10">
                <div className="mb-4">
                  <h2 className="text-lg font-heading font-semibold text-white">Email Address</h2>
                  <p className="text-sm text-white/50 mt-1">Current: {user?.email}</p>
                </div>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="input w-full"
                  />
                  <button onClick={handleChangeEmail} disabled={saving || !newEmail} className="btn-outline w-full">
                    {saving ? 'Sending...' : 'Send Email Change Confirmation'}
                  </button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="pt-6 border-t border-red-500/20">
                <div className="mb-4">
                  <h2 className="text-lg font-heading font-semibold text-red-400">Clear Data</h2>
                  <p className="text-sm text-white/50 mt-1">Permanently delete your account and all data</p>
                </div>
                <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-medium transition"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
            <div className="mb-6">
              <h2 className="text-lg font-heading font-semibold text-white">Dietary Restrictions</h2>
            </div>

            <div className="space-y-6">
              {/* Dietary Restrictions Info */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 ">
                <p className="text-white font-medium text-sm">Dietary Restrictions</p>
                <p className="text-white/60 text-sm mt-1">
                  Select your dietary restrictions below. AI recommendations will automatically exclude foods that don't meet these requirements.
                </p>
              </div>

              {/* Restrictions Grid */}
              <div className="grid grid-cols-2 gap-3">
                {DIETARY_RESTRICTIONS.map((restriction) => {
                  const isSelected = dietaryRestrictions.includes(restriction.key);
                  return (
                    <button
                      key={restriction.key}
                      onClick={() => toggleRestriction(restriction.key)}
                      className={`p-4  border text-left transition ${
                        isSelected 
                          ? 'bg-primary-700/20 border-primary-700/50' 
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5  border-2 flex items-center justify-center transition ${
                          isSelected 
                            ? 'bg-primary-700 border-primary-700' 
                            : 'border-white/30'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}>
                            {restriction.label}
                          </p>
                          <p className="text-white/40 text-xs">{restriction.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Summary */}
              {dietaryRestrictions.length > 0 && (
                <div className="p-4 bg-primary-700/10 border border-primary-700/30 ">
                  <p className="text-white/60 text-sm mb-2">Active restrictions:</p>
                  <div className="flex flex-wrap gap-2">
                    {dietaryRestrictions.map(key => {
                      const restriction = DIETARY_RESTRICTIONS.find(r => r.key === key);
                      return (
                        <span key={key} className="px-2 py-1 bg-primary-700/30 text-primary-400  text-sm">
                          {restriction?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button 
                onClick={handleSaveProfile} 
                disabled={saving} 
                className="btn-primary w-full py-3"
              >
                Save Dietary Preferences
              </button>
            </div>
          </motion.div>
        )}

        {/* Password Reset Email Sent Popup */}
        {showPasswordPopup && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowPasswordPopup(false)}>
            <div className="card p-8 max-w-md w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-primary-400" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-white mb-2">Check Your Email</h3>
                <p className="text-white/70 mb-6">
                  We've sent a password reset link to <span className="text-white font-medium">{user?.email}</span>. 
                  Click the link in the email to reset your password.
                </p>
                <button onClick={() => setShowPasswordPopup(false)} className="btn-primary w-full">
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Change Confirmation Popup */}
        {showEmailPopup && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowEmailPopup(false)}>
            <div className="card p-8 max-w-md w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-secondary-400" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-white mb-2">Confirm Email Change</h3>
                <p className="text-white/70 mb-6">
                  We've sent confirmation links to both your current email (<span className="text-white font-medium">{user?.email}</span>) 
                  and your new email address. Please check both inboxes and click the confirmation links to complete the change.
                </p>
                <button onClick={() => setShowEmailPopup(false)} className="btn-primary w-full">
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteConfirm(false)}>
            <div className="card p-8 max-w-md w-full border border-red-500/30" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} className="text-red-400" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-white mb-2">Delete Account?</h3>
                <p className="text-white/70">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 p-4 mb-6 text-left">
                <p className="text-red-400 text-sm font-semibold mb-2">This will delete:</p>
                <ul className="text-white/60 text-sm space-y-1 ml-4 list-disc">
                  <li>Your profile and account settings</li>
                  <li>All meal logs and nutrition data</li>
                  <li>Fasting schedules and history</li>
                  <li>Progress charts and analytics</li>
                  <li>Uploaded meal photos</li>
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">
                  Type <span className="text-red-400 font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="input w-full"
                  placeholder="Type DELETE"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="btn-outline flex-1"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || saving}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white font-semibold transition"
                >
                  {saving ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
