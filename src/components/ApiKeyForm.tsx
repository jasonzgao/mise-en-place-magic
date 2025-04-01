
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

type ApiKeyFormProps = {
  onSubmit: (apiKey: string) => void;
};

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onSubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter an OpenAI API key');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      setError('This doesn\'t look like a valid OpenAI API key. Keys start with "sk-"');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('openaiApiKey', apiKey);
    
    // Pass to parent
    onSubmit(apiKey);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>OpenAI API Key Required</CardTitle>
          <CardDescription>
            Enter your OpenAI API key to optimize recipe preparation. This will allow the extension to analyze and create mise-en-place guides.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError('');
                  }}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your API key is stored locally on your device and is never sent to our servers.
                  It's only used to communicate directly with OpenAI.
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full">
              Save API Key
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ApiKeyForm;
