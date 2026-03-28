/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Utensils,
  Calendar,
  PieChart as PieChartIcon,
  Search,
  Download,
  Sparkles,
  Loader2,
  LayoutGrid
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types & Constants ---

type SchoolLevel = 'PAUD' | 'SD' | 'SMP' | 'SMA';

interface NutriTarget {
  calories: number;
  protein: number; // in grams
  fat: number; // in grams
  carbs: number; // in grams
}

const TARGETS: Record<SchoolLevel, NutriTarget> = {
  PAUD: { calories: 450, protein: 15, fat: 15, carbs: 65 },
  SD: { calories: 550, protein: 20, fat: 18, carbs: 80 },
  SMP: { calories: 650, protein: 25, fat: 22, carbs: 95 },
  SMA: { calories: 750, protein: 30, fat: 25, carbs: 110 },
};

interface FoodItem {
  id: string;
  name: string;
  category: 'Karbohidrat' | 'Protein Hewani' | 'Protein Nabati' | 'Sayuran' | 'Buah';
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  servingSize: string;
}

interface SelectedFoodItem extends FoodItem {
  quantity: number;
}

interface DayPlan {
  menuSetName: string;
  items: SelectedFoodItem[];
}

const FOOD_LIBRARY: FoodItem[] = [
  // Karbohidrat
  { id: 'nasi-putih', name: 'Nasi Putih', category: 'Karbohidrat', calories: 130, protein: 2.7, fat: 0.3, carbs: 28, servingSize: '100g' },
  { id: 'nasi-merah', name: 'Nasi Merah', category: 'Karbohidrat', calories: 110, protein: 2.6, fat: 0.9, carbs: 23, servingSize: '100g' },
  { id: 'kentang-rebus', name: 'Kentang Rebus', category: 'Karbohidrat', calories: 87, protein: 1.9, fat: 0.1, carbs: 20, servingSize: '100g' },
  { id: 'ubi-jalar', name: 'Ubi Jalar', category: 'Karbohidrat', calories: 86, protein: 1.6, fat: 0.1, carbs: 20, servingSize: '100g' },
  
  // Protein Hewani
  { id: 'ayam-bakar', name: 'Ayam Bakar (Tanpa Kulit)', category: 'Protein Hewani', calories: 165, protein: 31, fat: 3.6, carbs: 0, servingSize: '100g' },
  { id: 'telur-rebus', name: 'Telur Rebus', category: 'Protein Hewani', calories: 155, protein: 13, fat: 11, carbs: 1.1, servingSize: '100g' },
  { id: 'ikan-kembung', name: 'Ikan Kembung Goreng', category: 'Protein Hewani', calories: 167, protein: 19, fat: 9, carbs: 0, servingSize: '100g' },
  { id: 'daging-sapi', name: 'Daging Sapi Semur', category: 'Protein Hewani', calories: 250, protein: 26, fat: 15, carbs: 0, servingSize: '100g' },

  // Protein Nabati
  { id: 'tempe-bacem', name: 'Tempe Bacem', category: 'Protein Nabati', calories: 192, protein: 19, fat: 11, carbs: 9, servingSize: '100g' },
  { id: 'tahu-goreng', name: 'Tahu Goreng', category: 'Protein Nabati', calories: 115, protein: 8, fat: 5, carbs: 2, servingSize: '100g' },
  { id: 'kacang-hijau', name: 'Bubur Kacang Hijau', category: 'Protein Nabati', calories: 105, protein: 7, fat: 0.5, carbs: 19, servingSize: '100g' },

  // Sayuran
  { id: 'sayur-bayam', name: 'Sayur Bayam', category: 'Sayuran', calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6, servingSize: '100g' },
  { id: 'sayur-asam', name: 'Sayur Asam', category: 'Sayuran', calories: 30, protein: 1.5, fat: 0.5, carbs: 5, servingSize: '100g' },
  { id: 'capcay', name: 'Capcay', category: 'Sayuran', calories: 67, protein: 3, fat: 4, carbs: 6, servingSize: '100g' },
  { id: 'tumis-kangkung', name: 'Tumis Kangkung', category: 'Sayuran', calories: 45, protein: 2.5, fat: 3, carbs: 4, servingSize: '100g' },

  // Buah
  { id: 'pisang', name: 'Pisang Ambon', category: 'Buah', calories: 89, protein: 1.1, fat: 0.3, carbs: 23, servingSize: '100g' },
  { id: 'pepaya', name: 'Pepaya', category: 'Buah', calories: 43, protein: 0.5, fat: 0.3, carbs: 11, servingSize: '100g' },
  { id: 'jeruk', name: 'Jeruk Manis', category: 'Buah', calories: 47, protein: 0.9, fat: 0.1, carbs: 12, servingSize: '100g' },
  { id: 'melon', name: 'Melon', category: 'Buah', calories: 36, protein: 0.8, fat: 0.2, carbs: 8, servingSize: '100g' },
];

const COLORS = ['#F27D26', '#E4E3E0', '#141414', '#8E9299'];

// --- Components ---

export default function App() {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const [level, setLevel] = useState<SchoolLevel>('SD');
  const [currentDay, setCurrentDay] = useState('Senin');
  const [weeklyPlan, setWeeklyPlan] = useState<Record<string, DayPlan>>({
    'Senin': { menuSetName: 'Menu Senin', items: [] },
    'Selasa': { menuSetName: 'Menu Selasa', items: [] },
    'Rabu': { menuSetName: 'Menu Rabu', items: [] },
    'Kamis': { menuSetName: 'Menu Kamis', items: [] },
    'Jumat': { menuSetName: 'Menu Jumat', items: [] },
    'Sabtu': { menuSetName: 'Menu Sabtu', items: [] },
    'Minggu': { menuSetName: 'Menu Minggu', items: [] }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'planner' | 'weekly' | 'monthly'>('planner');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedFoods = useMemo(() => weeklyPlan[currentDay]?.items || [], [weeklyPlan, currentDay]);
  const currentMenuSetName = weeklyPlan[currentDay]?.menuSetName || `Menu ${currentDay}`;

  const setSelectedFoods = (foods: SelectedFoodItem[]) => {
    setWeeklyPlan(prev => ({ 
      ...prev, 
      [currentDay]: { 
        ...prev[currentDay], 
        items: foods 
      } 
    }));
  };

  const setMenuSetName = (name: string) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [currentDay]: {
        ...prev[currentDay],
        menuSetName: name
      }
    }));
  };

  const generateWeeklyMenu = async () => {
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a COMPLETE 7-day healthy Indonesian school lunch menu plan (Makan Bergizi Gratis). 
        You MUST provide a menu for EVERY day from Senin to Minggu (7 days total).
        Each day must have a catchy "Menu Set Name" (e.g., "Nasi Ayam Bakar Madu", "Soto Ayam Spesial", "Nasi Kuning Nusantara").
        Each day must have exactly 5 items: 1 Carbohydrate, 1 Animal Protein, 1 Plant Protein, 1 Vegetable, and 1 Fruit.
        The menus should be varied across the week to prevent boredom.
        Target calories for SD level is ~550 kcal per day.
        Return the response in JSON format as an object where keys are day names ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu').`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: days.reduce((acc, day) => ({
              ...acc,
              [day]: {
                type: Type.OBJECT,
                properties: {
                  menuSetName: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        category: { 
                          type: Type.STRING, 
                          enum: ['Karbohidrat', 'Protein Hewani', 'Protein Nabati', 'Sayuran', 'Buah'] 
                        },
                        calories: { type: Type.NUMBER },
                        protein: { type: Type.NUMBER },
                        fat: { type: Type.NUMBER },
                        carbs: { type: Type.NUMBER },
                        servingSize: { type: Type.STRING }
                      },
                      required: ['id', 'name', 'category', 'calories', 'protein', 'fat', 'carbs', 'servingSize']
                    }
                  }
                },
                required: ['menuSetName', 'items']
              }
            }), {}),
            required: days
          }
        }
      });

      const generatedPlan = JSON.parse(response.text);
      const formattedPlan: Record<string, DayPlan> = {};
      
      Object.keys(generatedPlan).forEach(day => {
        formattedPlan[day] = {
          menuSetName: generatedPlan[day].menuSetName,
          items: generatedPlan[day].items.map((item: FoodItem) => ({ ...item, quantity: 1 }))
        };
      });

      setWeeklyPlan(formattedPlan);
      setView('weekly');
    } catch (error) {
      console.error("Weekly AI Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAIMenu = async () => {
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a healthy Indonesian school lunch menu (Makan Bergizi Gratis) for ${currentDay} that is balanced and follows Juknis MBG guidelines. 
        The menu should have a catchy "Menu Set Name" (e.g., "Nasi Ayam Goreng Kuning").
        The menu should consist of 5 items: 1 Carbohydrate, 1 Animal Protein, 1 Plant Protein, 1 Vegetable, and 1 Fruit.
        Return the response in JSON format.
        Ensure the total calories for the SD level (base) is around 550 kcal.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              menuSetName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    category: { 
                      type: Type.STRING, 
                      enum: ['Karbohidrat', 'Protein Hewani', 'Protein Nabati', 'Sayuran', 'Buah'] 
                    },
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    servingSize: { type: Type.STRING }
                  },
                  required: ['id', 'name', 'category', 'calories', 'protein', 'fat', 'carbs', 'servingSize']
                }
              }
            },
            required: ['menuSetName', 'items']
          }
        }
      });

      const generated = JSON.parse(response.text);
      const menuWithQuantity = generated.items.map((item: FoodItem) => ({ ...item, quantity: 1 }));
      
      setWeeklyPlan(prev => ({
        ...prev,
        [currentDay]: {
          menuSetName: generated.menuSetName,
          items: menuWithQuantity
        }
      }));
    } catch (error) {
      console.error("AI Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const totals = useMemo(() => {
    return selectedFoods.reduce((acc, food) => ({
      calories: acc.calories + (food.calories * food.quantity),
      protein: acc.protein + (food.protein * food.quantity),
      fat: acc.fat + (food.fat * food.quantity),
      carbs: acc.carbs + (food.carbs * food.quantity),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }, [selectedFoods]);

  const target = TARGETS[level];

  const chartData = [
    { name: 'Protein', value: totals.protein * 4, fill: '#F27D26' }, // 4 kcal/g
    { name: 'Lemak', value: totals.fat * 9, fill: '#8E9299' }, // 9 kcal/g
    { name: 'Karbohidrat', value: totals.carbs * 4, fill: '#141414' }, // 4 kcal/g
  ];

  const filteredLibrary = FOOD_LIBRARY.filter(food => 
    food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    food.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addFood = (food: FoodItem) => {
    setSelectedFoods([...selectedFoods, { ...food, quantity: 1 }]);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newFoods = [...selectedFoods];
    newFoods[index].quantity = Math.max(0.1, quantity);
    setSelectedFoods(newFoods);
  };

  const removeFood = (index: number) => {
    const newFoods = [...selectedFoods];
    newFoods.splice(index, 1);
    setSelectedFoods(newFoods);
  };

  const getStatusColor = (current: number, target: number) => {
    const ratio = current / target;
    if (ratio < 0.8) return 'text-amber-500';
    if (ratio > 1.2) return 'text-red-500';
    return 'text-green-500';
  };

  const getProgressBarColor = (current: number, target: number) => {
    const ratio = current / target;
    if (ratio < 0.8) return 'bg-amber-500';
    if (ratio > 1.2) return 'bg-red-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#141414] text-[#E4E3E0] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-[#F27D26] p-2 rounded-lg">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase italic font-serif">NutriPlan MBG</h1>
            <p className="text-[10px] opacity-60 uppercase tracking-widest font-mono">Nutritionist Menu Planner v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1 rounded-full border border-white/20">
          {(['PAUD', 'SD', 'SMP', 'SMA'] as SchoolLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all uppercase tracking-tighter",
                level === l ? "bg-[#F27D26] text-white" : "hover:bg-white/10"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={generateWeeklyMenu}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors disabled:opacity-50 border border-white/20"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Gen Weekly
          </button>
          <button 
            onClick={generateAIMenu}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-[#F27D26] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#d66a1d] transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gen Day
          </button>
          <button 
            onClick={() => setView('planner')}
            className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-opacity", view === 'planner' ? "opacity-100" : "opacity-40")}
          >
            <PieChartIcon className="w-4 h-4" /> Planner
          </button>
          <button 
            onClick={() => setView('weekly')}
            className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-opacity", view === 'weekly' ? "opacity-100" : "opacity-40")}
          >
            <Calendar className="w-4 h-4" /> Weekly
          </button>
          <button 
            onClick={() => setView('monthly')}
            className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-opacity", view === 'monthly' ? "opacity-100" : "opacity-40")}
          >
            <LayoutGrid className="w-4 h-4" /> Monthly
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {view === 'planner' ? (
          <>
            {/* Left Column: Dashboard & Current Menu */}
            <div className="lg:col-span-7 space-y-8">
              {/* Day Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {days.map(day => (
                  <button
                    key={day}
                    onClick={() => setCurrentDay(day)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border",
                      currentDay === day 
                        ? "bg-[#141414] text-white border-[#141414]" 
                        : "bg-white text-[#141414] border-[#141414]/10 hover:border-[#F27D26]"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Menu Set Name Input */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#141414]/5 flex flex-col md:flex-row items-center gap-4">
                <div className="bg-[#F27D26]/10 p-3 rounded-2xl">
                  <Utensils className="w-5 h-5 text-[#F27D26]" />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest block mb-1">Nama Set Menu ({currentDay})</label>
                  <input 
                    type="text" 
                    value={currentMenuSetName}
                    onChange={(e) => setMenuSetName(e.target.value)}
                    placeholder="Contoh: Nasi Ayam Bakar Madu..."
                    className="w-full bg-transparent font-serif italic text-xl focus:outline-none border-b border-[#141414]/10 focus:border-[#F27D26] transition-colors pb-1"
                  />
                </div>
              </div>

              {/* Multi-Level Comparison (Auto Adjust View) */}
              {selectedFoods.length > 0 && (
                <section className="bg-[#141414] text-white p-6 rounded-3xl shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif italic text-xl">Auto-Adjust Comparison</h3>
                    <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Semua Jenjang</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['PAUD', 'SD', 'SMP', 'SMA'] as SchoolLevel[]).map(lvl => {
                      const lvlTarget = TARGETS[lvl];
                      const multiplier = lvlTarget.calories / TARGETS['SD'].calories;
                      const adjustedCalories = Math.round(totals.calories * multiplier);
                      const adjustedProtein = Math.round(totals.protein * multiplier);
                      const isMatch = adjustedCalories >= lvlTarget.calories * 0.9 && adjustedCalories <= lvlTarget.calories * 1.1;

                      return (
                        <div key={lvl} className={cn(
                          "p-4 rounded-2xl border transition-all",
                          level === lvl ? "bg-[#F27D26] border-[#F27D26]" : "bg-white/5 border-white/10"
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold">{lvl}</span>
                            {isMatch ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-mono font-bold">{adjustedCalories}</div>
                            <div className="text-[8px] uppercase opacity-60 font-bold">Target: {lvlTarget.calories} kcal</div>
                            <div className="text-[8px] uppercase opacity-60 font-bold">Protein: {adjustedProtein}g</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Summary Card */}
              <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#141414]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <PieChartIcon className="w-32 h-32" />
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-48 h-48 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center -mt-28">
                      <span className="block text-3xl font-bold font-mono">{Math.round(totals.calories)}</span>
                      <span className="text-[10px] uppercase font-bold opacity-40">kcal</span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="font-serif italic text-2xl">Analisis Gizi</h2>
                        <p className="text-[11px] font-bold text-[#F27D26] uppercase tracking-tight mt-1">{currentMenuSetName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold opacity-40 block">Target {level}</span>
                        <span className="font-mono text-lg">{target.calories} kcal</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <NutriProgress label="Protein" current={totals.protein} target={target.protein} unit="g" />
                      <NutriProgress label="Lemak" current={totals.fat} target={target.fat} unit="g" />
                      <NutriProgress label="Karbohidrat" current={totals.carbs} target={target.carbs} unit="g" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-[#141414]/10 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-[#E4E3E0] px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                    <Info className="w-3 h-3" /> Juknis MBG 2025
                  </div>
                  {totals.calories >= target.calories * 0.9 && totals.calories <= target.calories * 1.1 ? (
                    <div className="flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Memenuhi Standar
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 text-[10px] font-bold uppercase">
                      <AlertCircle className="w-3 h-3" /> Perlu Penyesuaian
                    </div>
                  )}
                </div>
              </section>

              {/* Current Menu List */}
              <section className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-serif italic text-xl">Menu Terpilih</h3>
                  <span className="font-mono text-xs opacity-50 uppercase">{selectedFoods.length} Item</span>
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {selectedFoods.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white/50 border-2 border-dashed border-[#141414]/10 rounded-2xl p-12 text-center"
                      >
                        <Utensils className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-sm opacity-40 font-medium italic">Belum ada menu yang dipilih. Tambahkan dari perpustakaan bahan makanan.</p>
                      </motion.div>
                    ) : (
                      selectedFoods.map((food, idx) => (
                        <motion.div
                          key={`${food.id}-${idx}`}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group bg-white p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between border border-[#141414]/5 hover:border-[#F27D26]/30 transition-all shadow-sm gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0",
                              food.category === 'Karbohidrat' ? 'bg-[#141414]' :
                              food.category === 'Protein Hewani' ? 'bg-[#F27D26]' :
                              food.category === 'Protein Nabati' ? 'bg-[#8E9299]' :
                              'bg-green-600'
                            )}>
                              <span className="text-[10px] font-bold">{food.category[0]}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">{food.name}</h4>
                              <p className="text-[10px] opacity-40 uppercase font-mono">
                                {food.servingSize} • {Math.round(food.calories * food.quantity)} kcal
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
                            <div className="flex items-center gap-2 bg-[#E4E3E0] p-1 rounded-lg">
                              <span className="text-[10px] font-bold uppercase px-2 opacity-40">Porsi</span>
                              <input 
                                type="number" 
                                step="0.1"
                                min="0.1"
                                value={food.quantity}
                                onChange={(e) => updateQuantity(idx, parseFloat(e.target.value) || 0)}
                                className="w-12 bg-white rounded border-none text-center text-xs font-bold py-1 focus:ring-1 focus:ring-[#F27D26]"
                              />
                              <span className="text-[10px] font-bold pr-2 opacity-40">x</span>
                            </div>

                            <div className="hidden xl:flex gap-4 text-[10px] font-mono opacity-60">
                              <span>P: {Math.round(food.protein * food.quantity * 10) / 10}g</span>
                              <span>L: {Math.round(food.fat * food.quantity * 10) / 10}g</span>
                              <span>K: {Math.round(food.carbs * food.quantity * 10) / 10}g</span>
                            </div>
                            
                            <button 
                              onClick={() => removeFood(idx)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </div>

            {/* Right Column: Food Library */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-[#141414] text-white p-6 rounded-3xl shadow-xl sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif italic text-xl">Perpustakaan Bahan</h3>
                  <Download className="w-4 h-4 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" />
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input 
                    type="text"
                    placeholder="Cari bahan makanan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#F27D26] transition-colors"
                  />
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredLibrary.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => addFood(food)}
                      className="w-full text-left group bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{food.name}</span>
                          <span className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/60">{food.category}</span>
                        </div>
                        <p className="text-[10px] text-white/40 font-mono mt-1">{food.calories} kcal • {food.servingSize}</p>
                      </div>
                      <div className="bg-[#F27D26] p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : view === 'weekly' ? (
          <div className="lg:col-span-12">
            <WeeklyPlanner 
              level={level} 
              weeklyPlan={weeklyPlan} 
              onEditDay={(day) => {
                setCurrentDay(day);
                setView('planner');
              }}
            />
          </div>
        ) : (
          <div className="lg:col-span-12">
            <MonthlyPlanner 
              level={level} 
              weeklyPlan={weeklyPlan} 
              onEditDay={(day) => {
                setCurrentDay(day);
                setView('planner');
              }}
            />
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-[#141414]/10 p-12 bg-white/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5 text-[#F27D26]" />
              <span className="font-serif italic font-bold">NutriPlan MBG</span>
            </div>
            <p className="text-xs opacity-50 leading-relaxed">Aplikasi pendamping ahli gizi untuk implementasi program Makan Bergizi Gratis pemerintah Indonesia. Memastikan setiap anak mendapatkan nutrisi yang tepat untuk masa depan bangsa.</p>
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-4">Pedoman Juknis</h4>
            <ul className="text-xs space-y-2 font-medium">
              <li className="hover:text-[#F27D26] cursor-pointer transition-colors">Standar AKG 2025</li>
              <li className="hover:text-[#F27D26] cursor-pointer transition-colors">Protokol Higiene Sanitasi</li>
              <li className="hover:text-[#F27D26] cursor-pointer transition-colors">Manajemen Rantai Pasok Lokal</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-4">Kontak Dukungan</h4>
            <p className="text-xs font-mono">support@nutriplan.go.id</p>
            <p className="text-xs font-mono mt-1">0800-1-NUTRITION</p>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

function MonthlyPlanner({ 
  level, 
  weeklyPlan, 
  onEditDay 
}: { 
  level: SchoolLevel, 
  weeklyPlan: Record<string, DayPlan>,
  onEditDay: (day: string) => void
}) {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const weeks = [1, 2, 3, 4];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-serif italic text-4xl tracking-tight">Rencana Bulanan</h2>
          <p className="text-sm opacity-50 mt-2 font-medium uppercase tracking-widest">Monthly Nutrition Calendar • Level {level}</p>
        </div>
        <button className="bg-[#141414] text-white px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#F27D26] transition-all flex items-center gap-2 shadow-lg">
          <Download className="w-4 h-4" /> Export Monthly Report
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#141414]/5">
        <div className="grid grid-cols-7 gap-px bg-[#141414]/5 border border-[#141414]/5 rounded-2xl overflow-hidden">
          {days.map(day => (
            <div key={day} className="bg-[#E4E3E0]/30 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{day}</span>
            </div>
          ))}
          
          {weeks.map(week => (
            <React.Fragment key={week}>
              {days.map(day => {
                const plan = weeklyPlan[day] || { menuSetName: `Menu ${day}`, items: [] };
                return (
                  <div 
                    key={`${week}-${day}`} 
                    className="bg-white p-4 min-h-[120px] hover:bg-[#F27D26]/5 transition-colors cursor-pointer group"
                    onClick={() => onEditDay(day)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold opacity-20 group-hover:opacity-100 transition-opacity">W{week}</span>
                      <div className="flex gap-0.5">
                        {['Karbohidrat', 'Protein Hewani', 'Protein Nabati', 'Sayuran', 'Buah'].map(cat => (
                          <div 
                            key={cat}
                            className={cn(
                              "w-1 h-1 rounded-full",
                              plan.items.some(f => f.category === cat) ? "opacity-100" : "opacity-0"
                            )}
                            style={{ 
                              backgroundColor: 
                                cat === 'Karbohidrat' ? '#141414' : 
                                cat === 'Protein Hewani' ? '#F27D26' : 
                                cat === 'Protein Nabati' ? '#8E9299' : 
                                cat === 'Sayuran' ? '#16a34a' : '#fbbf24' 
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] font-bold leading-tight uppercase tracking-tighter line-clamp-3 group-hover:text-[#F27D26] transition-colors">
                      {plan.menuSetName}
                    </p>
                    {plan.items.length > 0 && (
                      <p className="text-[8px] font-mono opacity-40 mt-2">
                        {Math.round(plan.items.reduce((sum, f) => sum + (f.calories * f.quantity), 0))} kcal
                      </p>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-[#141414] text-white p-8 rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Info className="w-5 h-5 text-[#F27D26]" />
          <h3 className="font-serif italic text-xl">Catatan Bulanan</h3>
        </div>
        <p className="text-sm opacity-60 leading-relaxed max-w-2xl">
          Rencana bulanan ini merupakan perulangan dari rencana mingguan yang telah disusun. 
          Pastikan untuk melakukan rotasi menu setiap 2 minggu untuk menjaga variasi asupan mikronutrien 
          dan mencegah kebosanan pada siswa sesuai dengan Juknis MBG 2025.
        </p>
      </div>
    </div>
  );
}

function NutriProgress({ label, current, target, unit }: { label: string, current: number, target: number, unit: string }) {
  const percentage = Math.min((current / target) * 100, 100);
  const isOver = current > target * 1.1;
  const isUnder = current < target * 0.9;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
        <span className="opacity-60">{label}</span>
        <span className={cn(
          isOver ? "text-red-500" : isUnder ? "text-amber-500" : "text-green-600"
        )}>
          {Math.round(current)}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#E4E3E0] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn(
            "h-full rounded-full transition-colors",
            isOver ? "bg-red-500" : isUnder ? "bg-amber-500" : "bg-[#F27D26]"
          )}
        />
      </div>
    </div>
  );
}

function WeeklyPlanner({ 
  level, 
  weeklyPlan, 
  onEditDay 
}: { 
  level: SchoolLevel, 
  weeklyPlan: Record<string, DayPlan>,
  onEditDay: (day: string) => void
}) {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  
  const weeklyData = days.map(day => {
    const plan = weeklyPlan[day] || { menuSetName: `Menu ${day}`, items: [] };
    const foods = plan.items;
    const totals = foods.reduce((acc, food) => ({
      calories: acc.calories + (food.calories * food.quantity),
      protein: acc.protein + (food.protein * food.quantity),
    }), { calories: 0, protein: 0 });

    const categories = Array.from(new Set(foods.map(f => f.category)));

    return {
      day,
      menuSetName: plan.menuSetName,
      calories: totals.calories,
      protein: totals.protein,
      itemCount: foods.length,
      categories
    };
  });

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'Karbohidrat': return <div className="w-2 h-2 rounded-full bg-[#141414]" title="Karbohidrat" />;
      case 'Protein Hewani': return <div className="w-2 h-2 rounded-full bg-[#F27D26]" title="Protein Hewani" />;
      case 'Protein Nabati': return <div className="w-2 h-2 rounded-full bg-[#8E9299]" title="Protein Nabati" />;
      case 'Sayuran': return <div className="w-2 h-2 rounded-full bg-green-600" title="Sayuran" />;
      case 'Buah': return <div className="w-2 h-2 rounded-full bg-amber-400" title="Buah" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-serif italic text-4xl tracking-tight">Rencana Mingguan</h2>
          <p className="text-sm opacity-50 mt-2 font-medium uppercase tracking-widest">Master Nutrition Schedule • Level {level}</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-[#141414] border border-[#141414]/10 px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:border-[#F27D26] transition-all shadow-sm">
            Repeat for Month
          </button>
          <button className="bg-[#141414] text-white px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#F27D26] transition-all flex items-center gap-2 shadow-lg">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {weeklyData.map((data) => (
          <div 
            key={data.day} 
            className="bg-white p-8 rounded-[2rem] shadow-sm border border-[#141414]/5 group hover:border-[#F27D26]/30 transition-all relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#F27D26]/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h3 className="font-serif italic text-2xl mb-1">{data.day}</h3>
                  <p className="text-[11px] font-medium text-[#F27D26] line-clamp-1 mb-2 uppercase tracking-tight">
                    {data.menuSetName}
                  </p>
                  <div className="flex gap-1.5">
                    {['Karbohidrat', 'Protein Hewani', 'Protein Nabati', 'Sayuran', 'Buah'].map(cat => (
                      <div 
                        key={cat}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-opacity",
                          data.categories.includes(cat as any) ? "opacity-100" : "opacity-10"
                        )}
                        style={{ 
                          backgroundColor: 
                            cat === 'Karbohidrat' ? '#141414' : 
                            cat === 'Protein Hewani' ? '#F27D26' : 
                            cat === 'Protein Nabati' ? '#8E9299' : 
                            cat === 'Sayuran' ? '#16a34a' : '#fbbf24' 
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[10px] font-mono font-bold opacity-30 uppercase tracking-tighter">
                  {data.itemCount} Items
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold opacity-40 block tracking-widest">Energi</span>
                    <span className="font-mono text-2xl font-bold">{Math.round(data.calories)}</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-40 mb-1">KCAL</span>
                </div>
                
                <div className="h-1.5 w-full bg-[#E4E3E0] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((data.calories / TARGETS[level].calories) * 100, 100)}%` }}
                    className={cn(
                      "h-full transition-all",
                      data.calories > TARGETS[level].calories * 1.1 ? "bg-red-500" :
                      data.calories < TARGETS[level].calories * 0.9 ? "bg-amber-500" : "bg-[#F27D26]"
                    )}
                  />
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold opacity-40 tracking-widest">Protein</span>
                    <span className="font-mono text-sm font-bold">{Math.round(data.protein)}g</span>
                  </div>
                  <button 
                    onClick={() => onEditDay(data.day)}
                    className="p-3 bg-[#E4E3E0] hover:bg-[#141414] text-[#141414] hover:text-white rounded-2xl transition-all group/btn"
                  >
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-[#141414]/5">
        <div className="flex items-center justify-between mb-10">
          <h3 className="font-serif italic text-2xl">Tren Kalori Mingguan</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F27D26]" />
              <span className="text-[10px] font-bold uppercase opacity-40">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E4E3E0]" />
              <span className="text-[10px] font-bold uppercase opacity-40">Target</span>
            </div>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E3E0" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#141414', opacity: 0.5 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#141414', opacity: 0.5 }} 
              />
              <RechartsTooltip 
                cursor={{ fill: '#F27D26', opacity: 0.05 }}
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', 
                  fontSize: '12px',
                  padding: '16px'
                }}
              />
              <Bar dataKey="calories" fill="#F27D26" radius={[10, 10, 0, 0]} barSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
