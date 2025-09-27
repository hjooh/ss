'use client';

import { useState, useEffect } from 'react';
import { LobbySettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface SessionSettingsProps {
  settings: LobbySettings;
  onUpdateSettings: (settings: Partial<LobbySettings>) => void;
  isHost: boolean;
}

export const SessionSettings = ({ settings, onUpdateSettings, isHost }: SessionSettingsProps) => {
  const [localSettings, setLocalSettings] = useState<LobbySettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (key: keyof LobbySettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  if (!isHost) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Session Settings
          </CardTitle>
          <CardDescription>
            Only the host can modify session settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You need host permissions to view settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Session Settings
          {hasChanges && <Badge variant="outline" className="ml-auto">Unsaved Changes</Badge>}
        </CardTitle>
        <CardDescription>
          Configure how the apartment hunting session works
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voting Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Voting Settings</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="unanimous-voting">Require Unanimous Voting</Label>
              <p className="text-sm text-gray-500">All roommates must agree before advancing</p>
            </div>
            <Switch
              id="unanimous-voting"
              checked={localSettings.requireUnanimousVoting}
              onCheckedChange={(checked) => handleSettingChange('requireUnanimousVoting', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="veto-override">Allow Veto Override</Label>
              <p className="text-sm text-gray-500">Host can override veto decisions</p>
            </div>
            <Switch
              id="veto-override"
              checked={localSettings.allowVetoOverride}
              onCheckedChange={(checked) => handleSettingChange('allowVetoOverride', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-rating">Minimum Rating to Pass</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="min-rating"
                min={1}
                max={5}
                step={1}
                value={[localSettings.minimumRatingToPass]}
                onValueChange={([value]) => handleSettingChange('minimumRatingToPass', value)}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[3rem] justify-center">
                {localSettings.minimumRatingToPass}★
              </Badge>
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Session Management</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="member-navigation">Allow Member Navigation</Label>
              <p className="text-sm text-gray-500">Non-hosts can navigate between apartments</p>
            </div>
            <Switch
              id="member-navigation"
              checked={localSettings.allowMembersToControlNavigation}
              onCheckedChange={(checked) => handleSettingChange('allowMembersToControlNavigation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-advance">Auto-advance on Consensus</Label>
              <p className="text-sm text-gray-500">Automatically move to next apartment when everyone agrees</p>
            </div>
            <Switch
              id="auto-advance"
              checked={localSettings.autoAdvanceOnConsensus}
              onCheckedChange={(checked) => handleSettingChange('autoAdvanceOnConsensus', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="session-timeout"
                min={30}
                max={480}
                step={30}
                value={[localSettings.sessionTimeout]}
                onValueChange={([value]) => handleSettingChange('sessionTimeout', value)}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[4rem] justify-center">
                {localSettings.sessionTimeout}m
              </Badge>
            </div>
          </div>
        </div>

        {/* Filtering Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Filtering Preferences</h3>
          
          <div className="space-y-2">
            <Label htmlFor="max-rent">Maximum Rent ($)</Label>
            <Input
              id="max-rent"
              type="number"
              placeholder="No limit"
              value={localSettings.maxRent || ''}
              onChange={(e) => handleSettingChange('maxRent', e.target.value ? Number(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-bedrooms">Minimum Bedrooms</Label>
            <Input
              id="min-bedrooms"
              type="number"
              min="1"
              placeholder="No minimum"
              value={localSettings.minBedrooms || ''}
              onChange={(e) => handleSettingChange('minBedrooms', e.target.value ? Number(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-commute">Maximum Commute (minutes)</Label>
            <Input
              id="max-commute"
              type="number"
              placeholder="No limit"
              value={localSettings.maxCommute || ''}
              onChange={(e) => handleSettingChange('maxCommute', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Privacy Settings</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-ratings">Show Individual Ratings</Label>
              <p className="text-sm text-gray-500">Display each person's ratings to others</p>
            </div>
            <Switch
              id="show-ratings"
              checked={localSettings.showIndividualRatings}
              onCheckedChange={(checked) => handleSettingChange('showIndividualRatings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="guest-joining">Allow Guest Joining</Label>
              <p className="text-sm text-gray-500">Allow people without accounts to join</p>
            </div>
            <Switch
              id="guest-joining"
              checked={localSettings.allowGuestJoining}
              onCheckedChange={(checked) => handleSettingChange('allowGuestJoining', checked)}
            />
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notifications</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notify-ratings">Notify on New Ratings</Label>
              <p className="text-sm text-gray-500">Get notified when someone rates an apartment</p>
            </div>
            <Switch
              id="notify-ratings"
              checked={localSettings.notifyOnNewRatings}
              onCheckedChange={(checked) => handleSettingChange('notifyOnNewRatings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notify-vetos">Notify on Vetoes</Label>
              <p className="text-sm text-gray-500">Get notified when someone vetoes an apartment</p>
            </div>
            <Switch
              id="notify-vetos"
              checked={localSettings.notifyOnVetos}
              onCheckedChange={(checked) => handleSettingChange('notifyOnVetos', checked)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
