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
  onClose?: () => void;
}

export const SessionSettings = ({ settings, onUpdateSettings, isHost, onClose }: SessionSettingsProps) => {
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
    onClose?.();
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  
  

  return (
    <Card className="w-full border-0 rounded-none">
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
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="number-of-rounds">Number of Rounds</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="number-of-rounds"
                min={1}
                max={20}
                step={1}
                value={[localSettings.numberOfRounds || 10]}
                onValueChange={([value]) => handleSettingChange('numberOfRounds', value)}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[4rem] justify-center">
                {localSettings.numberOfRounds || 10}
              </Badge>
            </div>
          </div>
        </div>

        {/* Filtering Preferences */}
        {/* <div className="space-y-4">
          <h3 className="text-lg font-semibold">Group Filtering Preferences</h3>
          
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
        </div> */}

        {/* Privacy Settings */}
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-ratings">Anonymous Mode</Label>
              <p className="text-sm text-gray-500">Hide individual picks and show only group decisions</p>
            </div>
            <Switch
              id="show-ratings"
              checked={!localSettings.showIndividualRatings}
              onCheckedChange={(checked) => handleSettingChange('showIndividualRatings', !checked)}
            />
          </div>

          

        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 min-w-0"
          >
            <Save className="h-4 w-4 mr-2" />
            <span className="truncate">Save Settings</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex-1 min-w-0"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            <span className="truncate">Reset</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
