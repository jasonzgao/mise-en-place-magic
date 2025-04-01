
import React, { useState, useEffect } from 'react';
import { parseRecipeFromPage } from '@/utils/recipeParser';
import { generateMiseEnPlace } from '@/services/openaiService';
import RecipeCanvas from '@/components/RecipeCanvas';
import ApiKeyForm from '@/components/ApiKeyForm';
import LoadingIndicator from '@/components/LoadingIndicator';
import { Button } from '@/components/ui/button';
import { ChefHat } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [recipe, setRecipe] = useState<any>(null);
  const [miseEnPlace, setMiseEnPlace] = useState<any>({ steps: [], bowlCount: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  // Check for stored API key on load
  useEffect(() => {
    const storedApiKey = localStorage.getItem('openaiApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleExtractRecipe = async () => {
    setLoading(true);
    try {
      const extractedRecipe = await parseRecipeFromPage();
      
      if (!extractedRecipe) {
        toast.error("Couldn't detect a recipe on this page");
        setLoading(false);
        return;
      }
      
      setRecipe(extractedRecipe);
      
      // Check if we have an API key for OpenAI
      const storedApiKey = localStorage.getItem('openaiApiKey');
      
      if (!storedApiKey) {
        setNeedsApiKey(true);
        setLoading(false);
        return;
      }
      
      // Generate mise-en-place with OpenAI
      const miseEnPlaceResult = await generateMiseEnPlace(
        extractedRecipe.ingredients,
        extractedRecipe.instructions,
        storedApiKey
      );
      
      setMiseEnPlace(miseEnPlaceResult);
      setIsOpen(true);
      
    } catch (error) {
      console.error('Error processing recipe:', error);
      toast.error("Error processing recipe");
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeySubmit = async (key: string) => {
    setApiKey(key);
    setNeedsApiKey(false);
    
    // If we already have a recipe, generate mise-en-place
    if (recipe) {
      setLoading(true);
      try {
        const miseEnPlaceResult = await generateMiseEnPlace(
          recipe.ingredients,
          recipe.instructions,
          key
        );
        
        setMiseEnPlace(miseEnPlaceResult);
        setIsOpen(true);
      } catch (error) {
        console.error('Error generating mise-en-place:', error);
        toast.error("Error generating mise-en-place optimization");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // This would be a popup or overlay in the Chrome extension
  // For now, we simulate it with a full page app
  if (needsApiKey) {
    return <ApiKeyForm onSubmit={handleApiKeySubmit} />;
  }

  if (loading) {
    return <LoadingIndicator />;
  }

  // In a real extension, this button would appear in the browser UI
  // For now, we simulate it with a simple page
  if (!isOpen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <ChefHat size={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Mise-en-place Magic</h1>
          <p className="mb-6 text-muted-foreground">
            Transform recipe websites into clean, organized cooking instructions 
            with optimized mise-en-place preparation steps.
          </p>
          <p className="mb-8 text-sm text-muted-foreground">
            In the full Chrome extension, this button would appear when you visit a recipe website.
            For now, you can click it to see how the app would work with sample data.
          </p>
          <Button onClick={handleExtractRecipe} className="mx-auto">
            <ChefHat className="mr-2 h-4 w-4" /> Process Recipe
          </Button>
        </div>
      </div>
    );
  }

  // If we have a recipe and mise-en-place, show the canvas
  return <RecipeCanvas recipe={recipe} miseEnPlace={miseEnPlace} onClose={handleClose} />;
};

export default Index;
