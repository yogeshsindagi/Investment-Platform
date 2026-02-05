import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { 
  TrendingUp, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, 
  PieChart, Briefcase, Loader2, ChevronRight, Compass
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Constants & Maps ---
const SECTOR_MAP: Record<string, string> = {
  "ADANIENT": "Infrastructure", "ADANIPORTS": "Infrastructure",
  "APOLLOHOSP": "Healthcare", "CIPLA": "Healthcare", "DRREDDY": "Healthcare",
  "ASIANPAINT": "Consumer Goods", "HINDUNILVR": "FMCG", "ITC": "FMCG",
  "AXISBANK": "Finance", "BAJAJFINSV": "Finance", "BAJFINANCE": "Finance",
  "HDFCBANK": "Finance", "HDFCLIFE": "Finance", "ICICIBANK": "Finance",
  "BAJAJ-AUTO": "Automotive", "EICHERMOT": "Automotive", "HEROMOTOCO": "Automotive",
  "BEL": "Defense", "BHARTIARTL": "Telecom", "COALINDIA": "Energy",
  "GRASIM": "Materials", "HINDALCO": "Metals",
  "HCLTECH": "Technology", "INFY": "Technology",
  "ETERNAL": "Quick Commerce",
  "RELIANCE": "Energy", "SBILIFE": "Finance", "TCS": "Technology",
  "MARUTI": "Automotive", "SUNPHARMA": "Healthcare",
  "TITAN": "Consumer Goods", "ULTRACEMCO": "Materials", "NTPC": "Energy",
  "ONGC": "Energy", "JIOFIN": "Telecom",
  "JSWSTEEL": "Metals", "TRENT": "Consumer Goods", "TATASTEEL": "Metals",
  "TMPV": "Automotive", "TATACONSUM": "Consumer Goods",
  "TECHM": "Technology", "WIPRO": "Technology", "INDIGO": "Airlines",
  "NESTLEIND": "FMCG", "M&M": "Automotive",
  "POWERGRID": "Energy", "SBIN": "Finance", "LT": "Industrial",
  "PIDILITIND": "Chemicals", "BOSCHLTD": "Automotive"
}

// --- Types ---
interface PortfolioSummary {
  total_value: number
  invested_capital: number
  day_gain_loss: number
  day_percentage_change: number
  total_gain_loss: number
  total_percentage_change: number
}

interface Holding {
  stock_id: number
  asset: string
  ticker: string
  price: number
  buy_price: number
  invested_value: number
  holdings_value: number
  shares: number
  day_change: number
  total_gain_loss: number
  total_percentage: number
}

// --- Visual Components ---

const SummaryCard = ({ title, value, subValue, icon: Icon, subValueColor, isAllocation, onClick }: any) => {
  if (isAllocation) {
    return (
      <div 
        onClick={onClick}
        className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg bg-blue-100 border border-blue-200 cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 rounded-lg bg-blue-200 text-blue-700">
            <Icon className="h-5 w-5" />
          </div>
          <ChevronRight className="h-5 w-5 text-blue-400 group-hover:text-blue-700 transition-colors" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-blue-800">{title}</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-blue-900">{value}</span>
          </div>
          <p className="text-sm font-semibold flex items-center mt-1 text-blue-700">
            {subValue}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg bg-white border border-gray-100 shadow-sm hover:border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
        </div>
        {subValue && (
          <p className={`text-sm font-semibold flex items-center mt-1 ${subValueColor}`}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  )
}

const HoldingRow = ({ holding, onTrade }: { holding: Holding, onTrade: (type: 'BUY' | 'SELL', holding: Holding) => void }) => {
  const isPositive = holding.day_change >= 0
  const dayChangeColor = isPositive ? "text-green-600" : "text-red-600"
  const totalGainColor = holding.total_gain_loss >= 0 ? "text-green-600" : "text-red-600"

  return (
    <tr className="group border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
      <td className="py-4 pl-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-white group-hover:shadow-md transition-all">
            {holding.ticker[0]}
          </div>
          <div>
            <div className="font-bold text-gray-900">{holding.asset}</div>
            <div className="text-xs text-gray-500">{holding.ticker}</div>
          </div>
        </div>
      </td>
      <td className="py-4">
        <div className="font-medium text-gray-900">{holding.shares.toFixed(2)} Qty</div>
        <div className="text-xs text-gray-500">Inv: ₹{holding.invested_value.toLocaleString('en-IN')}</div>
      </td>
      <td className="py-4">
        <div className="font-semibold text-gray-900">₹{holding.price.toLocaleString('en-IN')}</div>
      </td>
      <td className="py-4">
        <div className={`flex items-center font-medium ${dayChangeColor} bg-opacity-10 rounded-md w-fit px-2 py-1`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {Math.abs(holding.day_change).toFixed(2)}%
        </div>
      </td>
      <td className="py-4">
        <div className={`font-bold ${totalGainColor}`}>
          {holding.total_gain_loss >= 0 ? "+" : ""}₹{holding.total_gain_loss.toLocaleString('en-IN')}
        </div>
        <div className={`text-xs ${totalGainColor} opacity-80`}>
          {holding.total_percentage.toFixed(2)}%
        </div>
      </td>
      <td className="py-4 pr-4 text-right">
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 border-green-200 text-green-700 hover:bg-green-50 cursor-pointer"
            onClick={() => onTrade('BUY', holding)}
          >
            Buy
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
            onClick={() => onTrade('SELL', holding)}
          >
            Sell
          </Button>
        </div>
      </td>
    </tr>
  )
}

// --- Trade Modal Component (Updated with Limits) ---
const TradeModal = ({ isOpen, onClose, type, holding, refreshData }: any) => {
  const [quantity, setQuantity] = useState(1)
  const [processing, setProcessing] = useState(false)
  
  // New States for Limit Orders
  const [orderMode, setOrderMode] = useState<'instant' | 'trigger'>('instant')
  const [targetPrice, setTargetPrice] = useState(0)

  // Reset state when modal opens
  useEffect(() => {
    if (holding) {
        setTargetPrice(holding.price)
        setOrderMode('instant')
        setQuantity(1)
    }
  }, [holding, isOpen])

  if (!isOpen || !holding) return null

  // Calculation depends on whether it's Instant or Limit
  const effectivePrice = orderMode === 'trigger' ? targetPrice : holding.price
  const totalAmount = quantity * effectivePrice

  const handleTransaction = async () => {
    setProcessing(true)
    const userId = localStorage.getItem("user_id")
    const token = localStorage.getItem("token")

    const BASE_URL = "https://investment-backend-54qm.onrender.com"

    if (!userId || !token) {
       toast.error("Session expired. Please login.")
       return
    }

    try {
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        const isTrigger = orderMode === 'trigger'
        
        // Use 'trigger' endpoint if Limit Order, else standard buy/sell
        // Note: Backend must support /trigger endpoint for this to work
        let endpoint = ''
        if (isTrigger) {
            endpoint = '/api/portfolio/trigger'
        } else {
            endpoint = type === 'BUY' ? '/api/portfolio/buy' : '/api/portfolio/sell'
        }

        const payload = {
            stock_id: holding.stock_id, 
            quantity: quantity,
            price: effectivePrice, // For Limit: Trigger Price; For Market: Current Price
            
            // Extra fields for Trigger Endpoint
            ...(isTrigger && { 
                target_price: targetPrice, 
                order_type: type === 'BUY' ? "B" : "S" 
            })
        }

        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || "Transaction failed")
        }

        const actionText = type === 'BUY' ? "Bought" : "Sold"
        toast.success(isTrigger 
            ? `Limit ${type} Order Placed at ₹${targetPrice}` 
            : `${actionText} ${quantity} shares successfully.`
        )
        
        refreshData()
        onClose()

    } catch (error: any) {
        toast.error(error.message)
    } finally {
        setProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center text-2xl font-bold">
             <span>{type === 'BUY' ? 'Buy' : 'Sell'} {holding.ticker}</span>
             <span className="text-blue-600 font-mono">₹{holding.price.toLocaleString('en-IN')}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
             {type === 'BUY' ? 'Add to your portfolio' : 'Liquidate your assets'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
           {/* Order Mode Tabs */}
           <div className="flex p-1 bg-gray-100 rounded-xl">
             <button 
                 onClick={() => setOrderMode('instant')}
                 className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${orderMode === 'instant' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
             >Regular</button>
             <button 
                 onClick={() => setOrderMode('trigger')}
                 className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${orderMode === 'trigger' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
             >Stoploss {type}</button>
          </div>

          {/* Quantity Input */}
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

          {/* Target Price (Only for Limit) */}
          {orderMode === 'trigger' && (
             <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                 <Label className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">
                    Trigger Price (₹)
                 </Label>
                 <Input 
                   type="number" 
                   value={targetPrice} 
                   onChange={(e) => setTargetPrice(Number(e.target.value))} 
                   className="h-12 text-lg font-bold border-blue-100 bg-blue-50/30" 
                 />
                 <p className="text-[10px] text-blue-400 text-center font-medium">
                    Order executes when price hits ₹{targetPrice}
                 </p>
             </div>
          )}

          {/* Total Value Display */}
          <div className="p-4 bg-gray-900 rounded-2xl flex justify-between items-center border border-white/5">
             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Amount</span>
             <span className="text-2xl font-bold text-white font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>

          <Button 
            className={`w-full h-14 text-md font-bold uppercase rounded-2xl shadow-lg active:scale-95 transition-transform cursor-pointer ${
                type === 'BUY' 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' 
                : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
            }`}
            onClick={handleTransaction} 
            disabled={processing}
          >
            {processing ? <Loader2 className="animate-spin mr-2" /> : null}
            {processing 
                ? 'Processing...' 
                : (orderMode === 'trigger' ? `Place Limit ${type}` : `${type}`)
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Sector Modal ---
const SectorModal = ({ isOpen, onClose, holdings }: any) => {
    const sectorCounts: Record<string, number> = {}
    let totalValue = 0;

    holdings.forEach((h: Holding) => {
        const sector = SECTOR_MAP[h.ticker] || "Others"
        sectorCounts[sector] = (sectorCounts[sector] || 0) + h.holdings_value
        totalValue += h.holdings_value
    })

    const sortedSectors = Object.entries(sectorCounts).sort(([, a], [, b]) => b - a)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle>Sector Allocation</DialogTitle>
                    <DialogDescription>Breakdown by industry.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {sortedSectors.map(([sector, value]) => {
                        const percent = ((value / totalValue) * 100).toFixed(1)
                        return (
                            <div key={sector} className="space-y-1">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>{sector}</span>
                                    <span>{percent}% (₹{value.toLocaleString()})</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        )
                    })}
                    {sortedSectors.length === 0 && <p className="text-center text-gray-500">No data available.</p>}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// --- Main Dashboard ---

export function PortfolioDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false)
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY')
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
  
  const ws = useRef<WebSocket | null>(null)

  const handleTradeClick = (type: 'BUY' | 'SELL', holding: Holding) => {
    setTradeType(type)
    setSelectedHolding(holding)
    setIsModalOpen(true)
  }

  const fetchPortfolio = async () => {
      const userId = localStorage.getItem("user_id")
      const token = localStorage.getItem("token")
      
      const BASE_URL = "https://investment-backend-54qm.onrender.com"
      
      if (!userId || !token) {
        navigate("/login")
        return
      }

      try {
        const res = await fetch(`${BASE_URL}/api/portfolio/${userId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })

        if (res.status === 401) {
          localStorage.clear()
          navigate("/login")
          return
        }

        const rawData = await res.json()
        
        const formattedHoldings: Holding[] = rawData.map((item: any) => ({
            stock_id: item.stock_id, 
            asset: item.stock_name,           
            ticker: item.stock_name,          
            price: item.current_price,        
            buy_price: item.buy_price, 
            invested_value: item.buy_price * item.quantity, 
            holdings_value: item.current_value, 
            shares: item.quantity,            
            day_change: item.day_change ?? 0,                   
            total_gain_loss: item.pnl,        
            total_percentage: (item.buy_price && item.quantity) 
                ? (item.pnl / (item.buy_price * item.quantity)) * 100 
                : 0
        }))
        
        setHoldings(formattedHoldings)
      } catch (error) {
        console.error("Failed to load portfolio", error)
      } finally {
        setLoading(false)
      }
  }

  // Initial Data Fetch
  useEffect(() => {
    fetchPortfolio()
  }, [navigate])

  // WebSocket Connection (Logic Updated to fix "Current Value" delay)
  useEffect(() => {
    const userId = localStorage.getItem("user_id")
    const token = localStorage.getItem("token")
    if (!userId || !token) return;

    const BASE_URL = "wss://investment-backend-54qm.onrender.com"
    // Use the general market stream which broadcasts ALL stocks
    // This ensures we get updates for our portfolio items immediately
    const socketUrl = `${BASE_URL}/api/portfolio/ws/market`
    ws.current = new WebSocket(socketUrl)

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === "update" && message.data) {
          const livePrices = message.data // This is a Map: { "1": {price: 200}, "2": ...}

        if (message.type === "ORDER_EXECUTED") {
            toast.success(`Limit Order Executed! Sold at ₹${message.price}`)
            fetchPortfolio() // Refresh data immediately
        }
          
          setHoldings((prevHoldings) => {
            return prevHoldings.map((h) => {
              // Direct lookup by stock_id is faster and more reliable than finding by name
              const stockUpdate = livePrices[h.stock_id]

              if (stockUpdate) {
                const newPrice = stockUpdate.price
                const investedAmount = h.invested_value 
                const newHoldingsValue = newPrice * h.shares
                const newTotalPnL = newHoldingsValue - investedAmount
                const newTotalPerc = investedAmount > 0 ? (newTotalPnL / investedAmount) * 100 : 0
                
                return {
                  ...h,
                  price: newPrice,
                  holdings_value: newHoldingsValue,
                  total_gain_loss: newTotalPnL,
                  total_percentage: newTotalPerc,
                  day_change: stockUpdate.day_change || 0 
                }
              }
              return h
            })
          })
        }
      } catch (err) { console.error(err) }
    }

    return () => { if (ws.current) ws.current.close() }
  }, []) 

  // Summary Calculation
  useEffect(() => {
    if (holdings.length > 0) {
        const totalVal = holdings.reduce((sum, item) => sum + item.holdings_value, 0)
        const invested = holdings.reduce((sum, item) => sum + item.invested_value, 0)
        const totalPnL = totalVal - invested
        const totalPerc = invested > 0 ? (totalPnL / invested) * 100 : 0

        setSummary({
            total_value: totalVal,
            invested_capital: invested,
            day_gain_loss: 0, 
            day_percentage_change: 0, 
            total_gain_loss: totalPnL,
            total_percentage_change: parseFloat(totalPerc.toFixed(2))
        })
    } else {
        setSummary({
          total_value: 0, invested_capital: 0, day_gain_loss: 0,
          day_percentage_change: 0, total_gain_loss: 0, total_percentage_change: 0
        })
    }
  }, [holdings])

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  const safeSummary = summary || { total_value: 0, invested_capital: 0, day_gain_loss: 0, day_percentage_change: 0, total_gain_loss: 0, total_percentage_change: 0 }

  const totalGainColor = safeSummary.total_gain_loss >= 0 ? "text-green-600" : "text-red-600"

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-blue-100">
      
      <TradeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        type={tradeType} 
        holding={selectedHolding} 
        refreshData={fetchPortfolio}
      />
      
      <SectorModal 
        isOpen={isSectorModalOpen} 
        onClose={() => setIsSectorModalOpen(false)} 
        holdings={holdings} 
      />

      {/* Nav */}
      <div className={`sticky top-0 z-40 w-full transition-all duration-200 ${scrolled ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="flex items-center space-x-2">
             <div className="bg-blue-600 p-1.5 rounded-lg"><Briefcase className="h-5 w-5 text-white" /></div>
             <span className="text-lg font-bold tracking-tight text-slate-800">Investment</span>
           </div>
           
           {/* LOGOUT */}
           <Button variant="ghost" className="cursor-pointer" onClick={() => { localStorage.clear(); navigate("/login") }}>Logout</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* HEADER AREA: Title + Market Button */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Portfolio</h1>
            <p className="text-slate-500 mt-1 flex items-center">
              <span className="relative inline-flex h-2 w-2 mr-2 items-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Market Data
            </p>
          </div>
          
          {/* EXPLORE MARKET BUTTON */}
          <Button 
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm gap-2 cursor-pointer"
            onClick={() => navigate("/market")}
          >
            <Compass className="h-4 w-4 text-blue-600" />
            Explore Market
          </Button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Current Value"
            value={`₹${safeSummary.total_value.toLocaleString('en-IN')}`}
            subValue={null} 
            icon={DollarSign}
            subValueColor="text-gray-500"
          />
          <SummaryCard
            title="Invested Capital"
            value={`₹${safeSummary.invested_capital.toLocaleString('en-IN')}`}
            subValue="Base Capital"
            icon={Wallet}
            subValueColor="text-gray-500"
          />
          <SummaryCard
            title="Total P&L"
            value={`₹${safeSummary.total_gain_loss.toLocaleString('en-IN')}`}
            subValue={`${safeSummary.total_percentage_change}% All Time`}
            icon={TrendingUp}
            subValueColor={totalGainColor}
          />
          <SummaryCard
            title="Allocation"
            value={holdings.length > 0 ? `${holdings.length} Assets` : "Empty"}
            subValue="View Breakdown"
            icon={PieChart}
            isAllocation={true}
            onClick={() => setIsSectorModalOpen(true)}
          />
        </div>
        
        {/* Table */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-gray-200/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-slate-800">Portfolio Holdings</CardTitle>
                <CardDescription>Real-time value of your {holdings.length} assets.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {holdings.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-gray-100 p-4 rounded-full mb-4"><Briefcase className="h-8 w-8 text-gray-400" /></div>
                    <h3 className="text-lg font-medium text-gray-900">No investments yet</h3>
                    
                    {/* NEW EMPTY STATE ACTION */}
                    <div className="mt-4">
                      <Button className="cursor-pointer" onClick={() => navigate("/market")}>
                         Start Investing
                      </Button>
                    </div>

                 </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Asset</th>
                        <th className="px-4 py-3">Qty & Invested</th>
                        <th className="px-4 py-3">LTP</th>
                        <th className="px-4 py-3">Day's Change</th>
                        <th className="px-4 py-3">Total P&L</th>
                        <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {holdings.map((holding) => (
                        <HoldingRow key={holding.ticker} holding={holding} onTrade={handleTradeClick} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
        </Card>
      </div>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar newestOnTop />
    </div>
  )
}