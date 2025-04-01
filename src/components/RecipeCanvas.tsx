
import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, ChefHat } from 'lucide-react';

type RecipeCanvasProps = {
  recipe: {
    title: string;
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    ingredients: string[];
    instructions: string[];
    url: string;
  };
  miseEnPlace: {
    steps: string[];
    bowlCount: number;
  };
  onClose: () => void;
};

const RecipeCanvas: React.FC<RecipeCanvasProps> = ({ recipe, miseEnPlace, onClose }) => {
  return (
    <div className="extension-overlay">
      <div className="recipe-canvas">
        <Card className="p-6 shadow-sm">
          <h1 className="recipe-title">{recipe.title}</h1>
          
          <div className="recipe-metadata">
            {recipe.totalTime && (
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>Total: {recipe.totalTime}</span>
              </div>
            )}
            
            {recipe.prepTime && (
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>Prep: {recipe.prepTime}</span>
              </div>
            )}
            
            {recipe.cookTime && (
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>Cook: {recipe.cookTime}</span>
              </div>
            )}
            
            {miseEnPlace.bowlCount > 0 && (
              <div className="flex items-center gap-1">
                <ChefHat size={16} />
                <span>Prep Bowls: {miseEnPlace.bowlCount}</span>
              </div>
            )}
          </div>
          
          <Separator className="my-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h2 className="section-title">Ingredients</h2>
              <ul className="ingredients-list">
                {recipe.ingredients.map((ingredient, idx) => (
                  <li key={idx}>{ingredient}</li>
                ))}
              </ul>
            </div>
            
            <div className="md:col-span-2">
              <div className="mise-en-place">
                <h3 className="mise-en-place-title">
                  <ChefHat className="inline mr-2" size={18} />
                  Optimized Mise En Place
                </h3>
                <ol className="mise-en-place-steps">
                  {miseEnPlace.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
              
              <h2 className="section-title">Original Instructions</h2>
              <ol className="instructions-list">
                {recipe.instructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
        
        <button
          className="extension-button"
          onClick={onClose}
          title="Close Recipe View"
        >
          X
        </button>
      </div>
    </div>
  );
};

export default RecipeCanvas;
