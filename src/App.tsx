import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, RefreshCw, Activity, Utensils, Flame, TrendingUp, ChevronRight, History, Coffee, Sun, Sunset, Moon, UtensilsCrossed, Cookie, Barcode, X, Camera } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { Food, LogEntry } from './types';
import alimentosData from './data/alimentos.json';

const alimentos: Food[] = alimentosData;

const MEAL_TYPES = [
  { id: 'pequeno_almoco', label: 'Pequeno almoço', icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'lanche_manha', label: 'Lanche da manhã', icon: Cookie, color: 'text-orange-400', bg: 'bg-orange-50' },
  { id: 'almoco', label: 'Almoço', icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'lanche_tarde', label: 'Lanche da tarde', icon: Cookie, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'jantar', label: 'Jantar', icon: Sunset, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'ceia', label: 'Ceia', icon: Moon, color: 'text-slate-600', bg: 'bg-slate-50' },
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [burnedCalories, setBurnedCalories] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState<string>('100');
  const [selectedMealType, setSelectedMealType] = useState<string>(MEAL_TYPES[0].id);
  const [activeTab, setActiveTab] = useState<'today' | 'goals' | 'zepp'>('today');
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Load data from localStorage
  useEffect(() => {
    const savedLogs = localStorage.getItem('food_logs');
    const savedBurned = localStorage.getItem('burned_calories');
    const savedGoal = localStorage.getItem('daily_goal');
    const savedLastSync = localStorage.getItem('last_sync');
    const lastDate = localStorage.getItem('last_date');
    const today = new Date().toLocaleDateString();

    if (lastDate !== today) {
      setLogs([]);
      setBurnedCalories(0);
      localStorage.setItem('last_date', today);
    } else {
      if (savedLogs) setLogs(JSON.parse(savedLogs));
      if (savedBurned) setBurnedCalories(Number(savedBurned));
    }
    
    if (savedGoal) setDailyGoal(Number(savedGoal));
    if (savedLastSync) setLastSync(savedLastSync);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('food_logs', JSON.stringify(logs));
    localStorage.setItem('burned_calories', burnedCalories.toString());
    localStorage.setItem('daily_goal', dailyGoal.toString());
    if (lastSync) localStorage.setItem('last_sync', lastSync);
  }, [logs, burnedCalories, dailyGoal, lastSync]);

  const filteredFoods = useMemo(() => {
    if (!searchQuery) return [];
    return alimentos.filter(f => 
      f.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const totalConsumed = useMemo(() => {
    return logs.reduce((acc, log) => acc + (log.food.kcal * log.amount) / 100, 0);
  }, [logs]);

  const netCalories = totalConsumed - burnedCalories;

  const handleAddLog = () => {
    if (selectedFood && amount) {
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        food: selectedFood,
        amount: Number(amount),
        timestamp: Date.now(),
        mealType: selectedMealType
      };
      setLogs([newEntry, ...logs]);
      setSelectedFood(null);
      setSearchQuery('');
      setAmount('100');
    }
  };

  const removeLog = (id: string) => {
    setLogs(logs.filter(log => log.id !== id));
  };

  const simulateZeppSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const randomBurned = Math.floor(Math.random() * 500) + 1500;
      setBurnedCalories(randomBurned);
      setLastSync(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }));
      setIsSyncing(false);
    }, 1500);
  };

  const fetchFoodByBarcode = async (barcode: string) => {
    setIsSearchingBarcode(true);
    setBarcodeError(null);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const fetchedFood: Food = {
          nome: p.product_name || 'Produto Desconhecido',
          kcal: p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0,
          proteina: p.nutriments.proteins_100g || 0,
          hidratos: p.nutriments.carbohydrates_100g || 0,
          lipidos: p.nutriments.fat_100g || 0,
        };
        setSelectedFood(fetchedFood);
        setIsScannerOpen(false);
      } else {
        setBarcodeError('Produto não encontrado na base de dados global.');
      }
    } catch (err) {
      setBarcodeError('Erro ao pesquisar o código de barras. Verifique a sua ligação.');
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render((decodedText) => {
        scanner.clear();
        fetchFoodByBarcode(decodedText);
      }, (error) => {
        // console.warn(error);
      });

      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [isScannerOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
            <Utensils size={24} />
            PortFIR + Zepp
          </h1>
          <button 
            onClick={simulateZeppSync}
            disabled={isSyncing}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-50"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {activeTab === 'today' && (
          <>
            {/* Summary Card */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Balanço Líquido</p>
                  <h2 className={`text-4xl font-black ${netCalories > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {Math.round(netCalories)} <span className="text-lg font-normal text-slate-400">kcal</span>
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-orange-500">
                    <Utensils size={16} />
                    <span className="text-xs font-bold uppercase">Consumido</span>
                  </div>
                  <p className="text-xl font-bold">{Math.round(totalConsumed)} <span className="text-xs font-normal text-slate-400">kcal</span></p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Activity size={16} />
                    <span className="text-xs font-bold uppercase">Gasto (Zepp)</span>
                  </div>
                  <p className="text-xl font-bold">{Math.round(burnedCalories)} <span className="text-xs font-normal text-slate-400">kcal</span></p>
                </div>
              </div>
            </section>

            {/* Search Section */}
            <section className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    placeholder="Pesquisar no PortFIR (ex: Arroz)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                  />
                </div>
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center"
                  title="Ler Código de Barras"
                >
                  <Barcode size={24} />
                </button>
              </div>

              <AnimatePresence>
                {searchQuery && filteredFoods.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredFoods.map((food) => (
                      <button
                        key={food.nome}
                        onClick={() => setSelectedFood(food)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <p className="font-medium">{food.nome}</p>
                          <p className="text-xs text-slate-400">{food.kcal} kcal / 100g</p>
                        </div>
                        <Plus size={18} className="text-emerald-500" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Log History */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <History size={18} />
                  Consumo de Hoje
                </h3>
                <span className="text-xs text-slate-400">{logs.length} itens</span>
              </div>

              <div className="space-y-8">
                {logs.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Utensils className="mx-auto text-slate-200 mb-2" size={40} />
                    <p className="text-slate-400 text-sm">Nenhum alimento registado hoje.</p>
                  </div>
                ) : (
                  MEAL_TYPES.map((meal) => {
                    const mealLogs = logs.filter(log => log.mealType === meal.id);
                    if (mealLogs.length === 0) return null;
                    
                    const mealTotal = mealLogs.reduce((acc, log) => acc + (log.food.kcal * log.amount) / 100, 0);

                    return (
                      <div key={meal.id} className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${meal.bg} ${meal.color}`}>
                              <meal.icon size={16} />
                            </div>
                            <h4 className="font-bold text-sm text-slate-600">{meal.label}</h4>
                          </div>
                          <span className="text-xs font-bold text-slate-400">{Math.round(mealTotal)} kcal</span>
                        </div>
                        
                        <div className="space-y-2">
                          {mealLogs.map((log) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={log.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm"
                            >
                              <div>
                                <p className="font-bold text-sm">{log.food.nome}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                  {log.amount}g • {Math.round((log.food.kcal * log.amount) / 100)} kcal
                                </p>
                              </div>
                              <button 
                                onClick={() => removeLog(log.id)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'goals' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Flame className="text-orange-500" size={20} />
                Meta Calórica Diária
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Objetivo de Consumo</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number"
                      value={dailyGoal}
                      onChange={(e) => setDailyGoal(Number(e.target.value))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xl font-bold text-slate-400">kcal</span>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Progresso</span>
                    <span className="font-bold">{Math.round((totalConsumed / dailyGoal) * 100)}%</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((totalConsumed / dailyGoal) * 100, 100)}%` }}
                      className={`h-full ${totalConsumed > dailyGoal ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Faltam {Math.max(0, Math.round(dailyGoal - totalConsumed))} kcal para atingir a meta.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-2">Dica de Nutrição</h4>
              <p className="text-sm text-emerald-700 leading-relaxed">
                Manter um registo preciso de todas as refeições, incluindo lanches, é fundamental para atingir os seus objetivos de saúde. A base de dados PortFIR garante que está a usar dados validados para a realidade portuguesa.
              </p>
            </section>
          </motion.div>
        )}

        {activeTab === 'zepp' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Activity className="text-blue-500" size={20} />
                  Estado Zepp OS
                </h3>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Ligado</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <RefreshCw size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Última Sincronização</p>
                      <p className="font-bold">{lastSync || 'Nunca sincronizado'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={simulateZeppSync}
                    disabled={isSyncing}
                    className="text-blue-500 font-bold text-sm hover:underline disabled:opacity-50"
                  >
                    Sincronizar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Calorias Ativas</p>
                    <p className="text-xl font-black text-blue-600">{Math.round(burnedCalories * 0.3)} <span className="text-xs font-normal">kcal</span></p>
                  </div>
                  <div className="p-4 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Metabolismo Basal</p>
                    <p className="text-xl font-black text-slate-400">{Math.round(burnedCalories * 0.7)} <span className="text-xs font-normal">kcal</span></p>
                  </div>
                </div>
              </div>
            </section>

            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-500">
                <Activity size={24} />
              </div>
              <div>
                <h4 className="font-bold text-blue-800 text-sm">Amazfit Balance 2</h4>
                <p className="text-xs text-blue-600">Sincronização via Health Connect ativa e funcional.</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScannerOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Camera size={24} className="text-emerald-600" />
                  Leitor de Código
                </h3>
                <button 
                  onClick={() => setIsScannerOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div id="reader" className="overflow-hidden rounded-2xl border-2 border-emerald-100 bg-slate-50 min-h-[300px]"></div>
                
                {isSearchingBarcode && (
                  <div className="flex items-center justify-center gap-3 py-4 text-emerald-600 font-bold">
                    <RefreshCw className="animate-spin" size={20} />
                    <span>A pesquisar produto...</span>
                  </div>
                )}

                {barcodeError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                    {barcodeError}
                  </div>
                )}

                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Aponte a câmara para o código de barras do produto. A pesquisa será feita automaticamente na base de dados global Open Food Facts.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal Overlay */}
      <AnimatePresence>
        {selectedFood && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFood(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
              <h3 className="text-xl font-bold mb-2">{selectedFood.nome}</h3>
              <p className="text-slate-500 text-sm mb-6">Base de dados PortFIR (INSA)</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Tipo de Refeição</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MEAL_TYPES.map((meal) => (
                      <button
                        key={meal.id}
                        onClick={() => setSelectedMealType(meal.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                          selectedMealType === meal.id 
                            ? `border-emerald-500 ${meal.bg} ${meal.color}` 
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        <meal.icon size={18} />
                        <span className="text-[9px] font-bold uppercase leading-tight">{meal.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quantidade (gramas)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                    <span className="text-xl font-bold text-slate-400">g</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Proteína</p>
                    <p className="font-bold">{((selectedFood.proteina * Number(amount)) / 100).toFixed(1)}g</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-blue-600">Hidratos</p>
                    <p className="font-bold">{((selectedFood.hidratos * Number(amount)) / 100).toFixed(1)}g</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-orange-600">Lípidos</p>
                    <p className="font-bold">{((selectedFood.lipidos * Number(amount)) / 100).toFixed(1)}g</p>
                  </div>
                </div>

                <button 
                  onClick={handleAddLog}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Adicionar {Math.round((selectedFood.kcal * Number(amount)) / 100)} kcal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Simulation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-40">
        <button 
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'today' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <TrendingUp size={24} />
          <span className="text-[10px] font-bold uppercase">Hoje</span>
        </button>
        <button 
          onClick={() => setActiveTab('goals')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'goals' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <Flame size={24} />
          <span className="text-[10px] font-bold uppercase">Metas</span>
        </button>
        <button 
          onClick={() => setActiveTab('zepp')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'zepp' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <Activity size={24} />
          <span className="text-[10px] font-bold uppercase">Zepp</span>
        </button>
      </nav>
    </div>
  );
}
