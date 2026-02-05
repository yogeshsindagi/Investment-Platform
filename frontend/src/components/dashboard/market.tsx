import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Search, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
// Make sure to install: npm install react-toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Constants: The Master List of 50 Stocks ---
const ALL_STOCKS = [
  { id: 1, name: "ADANIENT", sector: "Infrastructure", fullName: "Adani Enterprises" },
  { id: 2, name: "ADANIPORTS", sector: "Infrastructure", fullName: "Adani Ports & SEZ" },
  { id: 3, name: "APOLLOHOSP", sector: "Healthcare", fullName: "Apollo Hospitals Enterprise" },
  { id: 4, name: "ASIANPAINT", sector: "Consumer", fullName: "Asian Paints" },
  { id: 5, name: "AXISBANK", sector: "Finance", fullName: "Axis Bank" },
  { id: 6, name: "BAJAJ-AUTO", sector: "Auto", fullName: "Bajaj Auto" },
  { id: 7, name: "BAJAJFINSV", sector: "Finance", fullName: "Bajaj Finserv" },
  { id: 8, name: "BAJFINANCE", sector: "Finance", fullName: "Bajaj Finance " },
  { id: 9, name: "BEL", sector: "Defense", fullName: "Bharat Electronics" },
  { id: 10, name: "BHARTIARTL", sector: "Telecom", fullName: "Bharti Airtel" },
  { id: 11, name: "CIPLA", sector: "Healthcare", fullName: "Cipla" },
  { id: 12, name: "COALINDIA", sector: "Energy", fullName: "Coal India" },
  { id: 13, name: "DRREDDY", sector: "Healthcare", fullName: "Dr. Reddy's Laboratories" },
  { id: 14, name: "EICHERMOT", sector: "Auto", fullName: "Eicher Motors" },
  { id: 15, name: "ETERNAL", sector: "Quick Commerce", fullName: "Eternal Enterprises" },
  { id: 16, name: "GRASIM", sector: "Materials", fullName: "Grasim Industries" },
  { id: 17, name: "HCLTECH", sector: "Tech", fullName: "HCL Technologies" },
  { id: 18, name: "HDFCBANK", sector: "Finance", fullName: "HDFC Bank" },
  { id: 19, name: "HDFCLIFE", sector: "Finance", fullName: "HDFC Life Insurance Co" },
  { id: 20, name: "HEROMOTOCO", sector: "Auto", fullName: "Hero MotoCorp" },
  { id: 21, name: "HINDALCO", sector: "Metals", fullName: "Hindalco Industries" },
  { id: 22, name: "HINDUNILVR", sector: "FMCG", fullName: "Hindustan Unilever" },
  { id: 23, name: "ICICIBANK", sector: "Finance", fullName: "ICICI Bank" },
  { id: 24, name: "INFY", sector: "Tech", fullName: "Infosys" },
  { id: 25, name: "ITC", sector: "FMCG", fullName: "ITC" },
  { id: 26, name: "RELIANCE", sector: "Energy", fullName: "Reliance Industries" },
  { id: 27, name: "SBILIFE", sector: "Finance", fullName: "SBI Life Insurance Co" },
  { id: 28, name: "TCS", sector: "Tech", fullName: "Tata Consultancy Services" },
  { id: 29, name: "MARUTI", sector: "Auto", fullName: "Maruti Suzuki India" },
  { id: 30, name: "SUNPHARMA", sector: "Healthcare", fullName: "Sun Pharmaceutical Industries" },
  { id: 31, name: "TITAN", sector: "Consumer", fullName: "Titan Company" },
  { id: 32, name: "ULTRACEMCO", sector: "Materials", fullName: "UltraTech Cement" },
  { id: 33, name: "NTPC", sector: "Energy", fullName: "NTPC" },
  { id: 34, name: "ONGC", sector: "Energy", fullName: "Oil and Natural Gas Corporation" },
  { id: 35, name: "JIOFIN", sector: "Telecom", fullName: "Jio Financial Services" },
  { id: 36, name: "JSWSTEEL", sector: "Metals", fullName: "JSW Steel" },
  { id: 37, name: "TRENT", sector: "Consumer", fullName: "Trent Ltd" },
  { id: 38, name: "TATASTEEL", sector: "Metals", fullName: "Tata Steel" },
  { id: 39, name: "TMPV", sector: "Auto", fullName: "Tata Motors Passenger Vehicles" },
  { id: 40, name: "TATACONSUM", sector: "Consumer", fullName: "Tata Consumer Products" },
  { id: 41, name: "TECHM", sector: "Tech", fullName: "Tech Mahindra" },
  { id: 42, name: "WIPRO", sector: "Tech", fullName: "Wipro" },
  { id: 43, name: "INDIGO", sector: "Airlines", fullName: "InterGlobe Aviation (IndiGo)" },
  { id: 44, name: "NESTLEIND", sector: "FMCG", fullName: "Nestle India" },
  { id: 45, name: "M&M", sector: "Auto", fullName: "Mahindra & Mahindra" },
  { id: 46, name: "POWERGRID", sector: "Energy", fullName: "Power Grid Corporation of India" },
  { id: 47, name: "SBIN", sector: "Finance", fullName: "State Bank of India" },
  { id: 48, name: "LT", sector: "Industrial", fullName: "Larsen & Toubro" },
  { id: 49, name: "PIDILITIND", sector: "Chemicals", fullName: "Pidilite Industries" },
  { id: 50, name: "BOSCHLTD", sector: "Auto", fullName: "Bosch" },   
]

// --- Types ---
interface MarketStock {
  id: number
  name: string
  fullName: string
  sector: string
  price: number
  day_change: number
}

// --- Buy Modal (Advanced) ---
const BuyModal = ({ isOpen, onClose, stock }: any) => {
  const [quantity, setQuantity] = useState(1)
  const [targetPrice, setTargetPrice] = useState(0)
  const [orderMode, setOrderMode] = useState<'instant' | 'trigger'>('instant')
  const [processing, setProcessing] = useState(false)

  // Reset state when stock changes or modal opens
  useEffect(() => {
    if (stock) {
        setTargetPrice(stock.price)
        setOrderMode('instant')
        setQuantity(1)
    }
  }, [stock, isOpen])

  if (!isOpen || !stock) return null

  // Calculate required capital based on mode
  const effectivePrice = orderMode === 'trigger' ? targetPrice : stock.price
  const totalAmount = quantity * effectivePrice

  const handleBuy = async () => {
    setProcessing(true)
    const userId = localStorage.getItem("user_id")
    const token = localStorage.getItem("token")

    const BASE_URL = "https://investment-backend-54qm.onrender.com"

    if (!userId || !token) {
       toast.error("Please login again")
       return
    }

    try {
        await new Promise(resolve => setTimeout(resolve, 1500)) // Simulation delay
        
        // 1. Determine Endpoint & Payload based on Mode
        const isTrigger = orderMode === 'trigger'
        // Note: You must build the /trigger endpoint in backend, or this will fail/fallback
        const endpoint = isTrigger ? "/api/portfolio/trigger" : "/api/portfolio/buy"
        
        const payload = {
            stock_id: stock.id,
            quantity: quantity,
            price: effectivePrice, // For 'buy', this is current price. For 'trigger', this is target.
            // Add extra fields if your trigger endpoint needs them:
            ...(isTrigger && { target_price: targetPrice, order_type: "B" })
        }

        // 2. API Call
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // JWT Header
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || "Transaction failed")
        }

        // 3. Success Feedback
        toast.success(isTrigger 
            ? `Limit Order Placed for ${stock.name} at ₹${targetPrice}` 
            : `Successfully bought ${quantity} shares of ${stock.name}`
        )
        onClose()

    } catch (error: any) {
        toast.error(error.message)
    } finally {
        setProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-white border-none shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center text-2xl font-bold">
             <span>{stock.name}</span>
             <span className="text-blue-600 font-mono">₹{stock.price.toLocaleString('en-IN')}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">Set up your purchase order.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Tabs for Market vs Trigger */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
             <button 
                 onClick={() => setOrderMode('instant')}
                 className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${orderMode === 'instant' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
             >Regular</button>
             <button 
                 onClick={() => setOrderMode('trigger')}
                 className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${orderMode === 'trigger' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
             >Stoploss Buy</button>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Quantity</Label>
            <Input 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={(e) => setQuantity(Number(e.target.value))} 
              className="h-12 text-lg font-bold focus:ring-blue-500" 
            />
          </div>

          {/* Conditional Limit Price Input */}
          {orderMode === 'trigger' && (
             <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                 <Label className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">Trigger Price (₹)</Label>
                 <Input 
                   type="number" 
                   value={targetPrice} 
                   onChange={(e) => setTargetPrice(Number(e.target.value))} 
                   className="h-12 text-lg font-bold border-blue-100 bg-blue-50/30" 
                 />
                 <p className="text-[10px] text-blue-400 text-center font-medium">Wait for price to hit ₹{targetPrice} to execute</p>
             </div>
          )}

          {/* Dark Capital Box */}
          <div className="p-4 bg-gray-900 rounded-2xl flex justify-between items-center border border-white/5">
             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Required Capital</span>
             <span className="text-2xl font-bold text-white font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-md font-bold uppercase rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform cursor-pointer" 
          onClick={handleBuy} 
          disabled={processing}
        >
          {processing ? <Loader2 className="animate-spin mr-2" /> : (orderMode === 'trigger' ? "Place Limit Order" : "Buy Instantly")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export function MarketPage() {
  const navigate = useNavigate()
  // Pre-populate state so UI renders instantly
  const [stocks, setStocks] = useState<any[]>(ALL_STOCKS.map(s => ({ ...s, price: 0, day_change: 0 })))
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)
  const [isBuyOpen, setIsBuyOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const ws = useRef<WebSocket | null>(null)

  // 1. Connect to WebSocket
  useEffect(() => {
    const BASE_URL = "wss://investment-backend-54qm.onrender.com"
    // Using the URL structure from your existing setup
    const socketUrl = `${BASE_URL}/api/portfolio/ws/market`
    ws.current = new WebSocket(socketUrl)

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === "update" && message.data) {
           const liveData = message.data
           setStocks(prevStocks => prevStocks.map(s => ({
             ...s,
             price: liveData[s.id]?.price ?? s.price,
             day_change: liveData[s.id]?.day_change ?? s.day_change
           })))
           setLoading(false)
        }
      } catch (err) { console.error(err) }
    }

    return () => { if (ws.current) ws.current.close() }
  }, [])

  // 2. Filter Logic
  const filteredStocks = stocks.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleBuyClick = (stock: MarketStock) => {
      if (stock.price === 0) {
          toast.warning("Waiting for price data... please wait.")
          return
      }
      setSelectedStock(stock)
      setIsBuyOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans p-6">
      
      <BuyModal 
         isOpen={isBuyOpen} 
         onClose={() => setIsBuyOpen(false)} 
         stock={selectedStock} 
      />

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => navigate("/portfolio")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Explore Market</h1>
                    <p className="text-slate-500">Real-time prices for top 50 NSE stocks</p>
                </div>
            </div>
            
            <div className="relative w-full max-w-sm hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                   placeholder="Search stocks or sectors..." 
                   className="pl-9 bg-white"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Stock List */}
        <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg">Market Watch</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Sector</th>
                                <th className="px-6 py-4 text-right">Price</th>
                                <th className="px-6 py-4 text-right">Change</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && stocks[0].price === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                                        <p>Loading...</p>
                                    </td>
                                </tr>
                            ) : filteredStocks.map((stock) => {
                                const isPositive = stock.day_change >= 0
                                return (
                                    <tr key={stock.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{stock.name} <br /><span className="text-xs font-normal text-gray-500">{stock.fullName}</span></td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <span className="bg-slate-100 px-2 py-1 rounded text-xs">{stock.sector}</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-right">
                                            {stock.price > 0 ? `₹${stock.price.toLocaleString('en-IN')}` : <Loader2 className="h-4 w-4 animate-spin text-gray-300 inline"/>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`flex items-center justify-end ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                                                {Math.abs(stock.day_change).toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button 
                                                size="sm" 
                                                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                                onClick={() => handleBuyClick(stock)}
                                            >
                                                Buy
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {filteredStocks.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No stocks found matching "{searchTerm}"
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
      
      {/* Toast Container */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop />
    </div>
  )
}