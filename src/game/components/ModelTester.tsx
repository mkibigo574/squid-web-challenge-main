import { useState } from 'react';
import { MODEL_CONFIG } from '../config/models';

export const ModelTester = () => {
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const testModel = async (modelPath: string) => {
    try {
      const response = await fetch(modelPath);
      if (response.ok) {
        setTestResults(prev => ({ ...prev, [modelPath]: '✅ Loaded successfully' }));
      } else {
        setTestResults(prev => ({ ...prev, [modelPath]: '❌ Failed to load' }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [modelPath]: '❌ Error: ' + error }));
    }
  };

  const testAllModels = () => {
    Object.values(MODEL_CONFIG).forEach(config => {
      if (typeof config === 'object' && 'path' in config) {
        testModel(config.path);
      } else if (typeof config === 'object') {
        Object.values(config).forEach(path => {
          if (typeof path === 'string') {
            testModel(path);
          }
        });
      }
    });
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg max-w-sm z-50">
      <h3 className="text-lg font-bold mb-2">Model Loader Tester</h3>
      <button 
        onClick={testAllModels}
        className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded mb-2"
      >
        Test All Models
      </button>
      <div className="text-sm space-y-1">
        {Object.entries(testResults).map(([path, result]) => (
          <div key={path} className="flex justify-between">
            <span className="truncate">{path.split('/').pop()}</span>
            <span>{result}</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        Check console for detailed errors
      </div>
    </div>
  );
};
