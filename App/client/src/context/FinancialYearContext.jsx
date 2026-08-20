import { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "selected_financial_year";

function getCurrentFinancialYearStart() {
  const today = new Date();
  const year = today.getFullYear();
  return today.getMonth() >= 3 ? year : year - 1;
}

function normalizeStartYear(value) {
  const year = Number(value);
  return Number.isInteger(year) ? year : getCurrentFinancialYearStart();
}

export function getFinancialYearRange(startYear) {
  const year = normalizeStartYear(startYear);
  return {
    startYear: year,
    endYear: year + 1,
    startDate: `${year}-04-01`,
    endDate: `${year + 1}-03-31`,
    label: `FY ${year}-${String(year + 1).slice(-2)}`,
  };
}

function buildOptions(selectedStartYear) {
  const current = getCurrentFinancialYearStart();
  const years = new Set();

  for (let year = current + 1; year >= current - 5; year -= 1) {
    years.add(year);
  }
  years.add(selectedStartYear);

  return Array.from(years)
    .sort((a, b) => b - a)
    .map((year) => getFinancialYearRange(year));
}

const FinancialYearContext = createContext(null);

export function FinancialYearProvider({ children }) {
  const [selectedStartYear, setSelectedStartYear] = useState(() =>
    normalizeStartYear(localStorage.getItem(STORAGE_KEY)),
  );

  const value = useMemo(() => {
    const financialYear = getFinancialYearRange(selectedStartYear);

    return {
      financialYear,
      financialYearOptions: buildOptions(selectedStartYear),
      setFinancialYear(startYear) {
        const next = normalizeStartYear(startYear);
        localStorage.setItem(STORAGE_KEY, String(next));
        setSelectedStartYear(next);
      },
    };
  }, [selectedStartYear]);

  return (
    <FinancialYearContext.Provider value={value}>
      {children}
    </FinancialYearContext.Provider>
  );
}

export function useFinancialYear() {
  const context = useContext(FinancialYearContext);
  if (!context) {
    throw new Error("useFinancialYear must be used inside FinancialYearProvider");
  }
  return context;
}
