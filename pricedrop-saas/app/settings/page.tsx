'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { User, Bell, CreditCard, Shield } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      return data
    },
  })

  const [formData, setFormData] = useState({
    full_name: '',
    email_notifications: true,
    sms_notifications: false,
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email_notifications: profile.email_notifications,
        sms_notifications: profile.sms_notifications,
      })
    }
  }, [profile])

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Settings updated successfully')
    },
    onError: () => {
      toast.error('Failed to update settings')
    },
  })

  const handleSave = () => {
    updateProfileMutation.mutate(formData)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <User className="h-6 w-6 text-primary mr-2" />
              <h2 className="text-xl font-semibold">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  placeholder="Email address"
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Bell className="h-6 w-6 text-primary mr-2" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive price drop alerts via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.email_notifications}
                  onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
                  className="h-5 w-5 text-primary"
                  title="Enable or disable email notifications"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Receive price drop alerts via SMS</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.sms_notifications}
                  onChange={(e) => setFormData({ ...formData, sms_notifications: e.target.checked })}
                  className="h-5 w-5 text-primary"
                  title="Enable or disable SMS notifications"
                  placeholder="Enable or disable SMS notifications"
                />
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <CreditCard className="h-6 w-6 text-primary mr-2" />
              <h2 className="text-xl font-semibold">Subscription</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{profile?.plan} Plan</p>
                <p className="text-sm text-gray-600">
                  {profile?.tracked_count || 0} products tracked
                </p>
              </div>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Manage Subscription
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}