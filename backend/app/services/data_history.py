import datetime
import yfinance as yf
from zoneinfo import ZoneInfo


def get_prev_close(TICKERS, ID_MAP):
    ist = ZoneInfo("Asia/Kolkata")
    today = datetime.datetime.now(ist).date()
    weekday = today.weekday()  

    symbols = [f"{name}.NS" for name in TICKERS]
    prev_close_row = None

    try:

        if weekday in [5, 6]:  
            data_frame = yf.download(symbols, period='5d', progress=False, auto_adjust=False)['Close']
            data_dates = [d.date() for d in data_frame.index]

            if weekday == 5:      
                target_date = today - datetime.timedelta(days = 2)
            else:                
                target_date = today - datetime.timedelta(days = 3)

            while target_date not in data_dates:
                target_date -= datetime.timedelta(days=1)

            prev_close_row = data_frame.loc[data_frame.index.date == target_date].iloc[0]

        else:

            try:
                data_frame = yf.download(symbols, period='2d', progress=False, auto_adjust=False)['Close']
                prev_close_row = data_frame.iloc[-2] 
                
            except IndexError:
                data_frame = yf.download(symbols, period='5d', progress=False, auto_adjust=False)['Close']

                data_dates = [d.date() for d in data_frame.index]
                target_date = today - datetime.timedelta(days=1)
                while target_date not in data_dates:
                    target_date -= datetime.timedelta(days=1)
                prev_close_row = data_frame.loc[data_frame.index.date == target_date].iloc[0]

        mapped_prev_close = {}
        for name in TICKERS:
            stock_id = ID_MAP[name]
            try:
                price = prev_close_row[f"{name}.NS"]

                if str(price) != 'nan':
                    mapped_prev_close[stock_id] = round(float(price), 2)  
                else: 
                    mapped_prev_close[stock_id] = 0
                
            except:
                mapped_prev_close[stock_id] = 0
        
        return mapped_prev_close
            

    except Exception:
        return {ID_MAP[name]: 0 for name in TICKERS}
    


