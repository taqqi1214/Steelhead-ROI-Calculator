/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  Calculator, 
  Network, 
  TrendingUp, 
  DollarSign, 
  Server, 
  Building2, 
  Database, 
  ShieldCheck,
  ChevronRight,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface ROIInputs {
  supportYears: 1 | 3 | 5;
  branchSites: number;
  hqSites: number;
  dcSites: number;
  drSites: number;
  totalWanBw: number; // Mbps (Total for all sites)
  bwGrowthPercentage: number; // Annual growth %
  mplsMonthlyCostPerMbps: number;
  internetMonthlyCostPerMbps: number;
  mplsPercentage: number; // 0-100
  optimizationPercentage: number; // 0-100
  totalHwCost: number;
  totalLicenseCost: number;
  totalSupportCost: number;
  professionalServicesCost: number;
  latencyRtt: number; // ms
  tcpWindowSize: number; // KB
  numUsers: number; // Number of employees
  avgHourlyRate: number; // Avg Hourly Rate per Employee
  networkImpactFactor: number; // % of day spent on network-related tasks
  totalCustomers: number;
  churnReduction: number; // %
  annualOperatingIncomePerCustomer: number;
}

interface ROIMetrics {
  currentAnnualCost: number;
  optimizedAnnualCost: number;
  annualSavings: number;
  oneTimeInvestment: number;
  annualRecurringCost: number;
  totalInvestment: number;
  paybackMonths: number;
  hwComponent: number;
  psComponent: number;
  licenseComponent: number;
  supportComponent: number;
  roi1Yr: number;
  roi3Yr: number;
  roi5Yr: number;
  tco1Yr: number;
  tco3Yr: number;
  tco5Yr: number;
  grossSavings1Yr: number;
  grossSavings3Yr: number;
  grossSavings5Yr: number;
  netSavings5Yr: number;
  productivityGain1Yr: number;
  productivityGain3Yr: number;
  productivityGain5Yr: number;
  netSavingsPeriod: number;
  roiPeriod: number;
  tcoPeriod: number;
  grossSavingsPeriod: number;
  productivityGainPeriod: number;
  hoursGainedPeriod: number;
  incomeProtected: number;
  riverbedSpendData: { 
    name: string; 
    Riverbed: number; 
    ISP: number;
    Investment: number;
    HardSavings: number;
    TotalSavings: number;
  }[];
  yoyFinancialData: {
    name: string;
    ISP: number;
    Riverbed: number;
  }[];
  effectiveBwUnoptimized: number;
  effectiveBwOptimized: number;
  bdpBits: number;
  throughputLimitMbps: number;
  annualData: {
    tco: number[];
    grossSavings: number[];
    netSavings: number[];
    productivity: number[];
    roi: number[];
  };
}

// --- Constants & Assumptions ---

const BW_REDUCTION_RATE = 0.65; // 65% average reduction
const TCP_WINDOW_SIZES = [64, 128, 512, 1024, 2048, 4096, 8192, 16384, 32768];

const DEFAULT_INPUTS: ROIInputs = {
  supportYears: 3,
  branchSites: 10,
  hqSites: 1,
  dcSites: 1,
  drSites: 1,
  totalWanBw: 1300,
  bwGrowthPercentage: 15,
  mplsMonthlyCostPerMbps: 15,
  internetMonthlyCostPerMbps: 3,
  mplsPercentage: 40,
  optimizationPercentage: 65,
  totalHwCost: 85000,
  totalLicenseCost: 25000,
  totalSupportCost: 15000,
  professionalServicesCost: 10000,
  latencyRtt: 80,
  tcpWindowSize: 64,
  numUsers: 500,
  avgHourlyRate: 50,
  networkImpactFactor: 5,
  totalCustomers: 1000,
  churnReduction: 10,
  annualOperatingIncomePerCustomer: 1000,
};

// --- Components ---

const InputField = ({ label, value, onChange, type = "number", min = 0, icon: Icon, suffix, className }: any) => (
  <div className={cn("space-y-1.5", className)}>
    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
      {Icon && <Icon size={12} className="text-zinc-400" />}
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        className="w-full bg-zinc-50 border-4 border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const MetricCard = ({ label, value, subValue, trend, icon: Icon, color = "blue" }: any) => {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    indigo: "text-indigo-600 bg-indigo-50",
    brown: "text-amber-800 bg-amber-50",
    purple: "text-purple-600 bg-purple-50",
  };

  const valueColors: any = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
    indigo: "text-indigo-600",
    brown: "text-amber-800",
    purple: "text-purple-600",
  };

  return (
    <div className="bg-white border-4 border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2.5 rounded-lg", colors[color])}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
            trend > 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
          )}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">{label}</p>
        <h3 className={cn("text-2xl font-bold", valueColors[color] || "text-zinc-900")}>{value}</h3>
        {subValue && <p className="text-xs text-zinc-400">{subValue}</p>}
      </div>
    </div>
  );
};

export default function App() {
  const [inputs, setInputs] = useState<ROIInputs>(() => {
    const saved = localStorage.getItem('steelhead_roi_inputs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved inputs', e);
      }
    }
    return DEFAULT_INPUTS;
  });

  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    localStorage.setItem('steelhead_roi_inputs', JSON.stringify(inputs));
  }, [inputs]);

  const downloadPDF = async () => {
    const input = document.getElementById('roi-dashboard-root');
    if (!input) return;
    
    // Save original styles outside try block so they can be restored in finally
    const originalWidth = input.style.width;
    const originalMaxWidth = input.style.maxWidth;
    const originalMargin = input.style.margin;
    const originalHeight = input.style.height;
    const originalPosition = input.style.position;
    const originalTop = input.style.top;
    const originalLeft = input.style.left;
    const originalZIndex = input.style.zIndex;
    
    try {
      setIsDownloading(true);
      
      // Force a desktop width for the capture so it doesn't get cut off on smaller screens
      // and so that the height is calculated correctly for a desktop layout.
      const targetWidth = 1280;
      
      // Apply fixed width to the actual DOM element and break it out of mobile viewport constraints
      input.style.width = `${targetWidth}px`;
      input.style.maxWidth = `${targetWidth}px`;
      input.style.margin = '0';
      input.style.height = 'auto';
      input.style.position = 'absolute';
      input.style.top = '0';
      input.style.left = '0';
      input.style.zIndex = '9999';
      
      // Wait for the browser to reflow and Recharts to resize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const targetHeight = input.scrollHeight;
      
      // Use html-to-image instead of html2canvas to support modern CSS like oklch
      // Use pixelRatio: 1 to prevent iOS Safari canvas size limits from cutting off the bottom
      const imgData = await htmlToImage.toPng(input, { 
        pixelRatio: 1,
        backgroundColor: '#fafafa', // Match bg-zinc-50
        width: targetWidth,
        height: targetHeight,
        filter: (node) => {
          // Filter out the download button container
          if (node instanceof HTMLElement && node.id === 'download-button-container') {
            return false;
          }
          // Filter out external images to prevent CORS errors during capture
          if (node instanceof HTMLImageElement && node.src && !node.src.startsWith('data:')) {
            return false;
          }
          return true;
        },
        style: {
          width: `${targetWidth}px`,
          maxWidth: `${targetWidth}px`,
          height: `${targetHeight}px`,
          margin: '0',
          position: 'relative',
          top: '0',
          left: '0'
        }
      });
      
      // Create a temporary jsPDF instance just to get image properties
      const tempPdf = new jsPDF();
      const imgProps = tempPdf.getImageProperties(imgData);
      
      // Create an A4 size PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10; // 10mm margin
      const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const contentHeight = pdfPageHeight - (margin * 2);
      
      // Calculate the height of the image in the PDF based on the A4 width
      const imgHeightInPdf = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeightInPdf;
      let position = margin;

      // Add first page
      pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, imgHeightInPdf);
      heightLeft -= contentHeight;

      // Add subsequent pages
      while (heightLeft > 0) {
        position -= contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, imgHeightInPdf);
        heightLeft -= contentHeight;
      }
      
      pdf.save('Steelhead-ROI-Report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again. If the issue persists, there might be a problem with external images loading.');
    } finally {
      // Restore original styles immediately after capture or error
      input.style.width = originalWidth;
      input.style.maxWidth = originalMaxWidth;
      input.style.margin = originalMargin;
      input.style.height = originalHeight;
      input.style.position = originalPosition;
      input.style.top = originalTop;
      input.style.left = originalLeft;
      input.style.zIndex = originalZIndex;
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all inputs to default values?')) {
      setInputs(DEFAULT_INPUTS);
    }
  };

  const metrics = useMemo(() => {
    const totalSites = inputs.branchSites + inputs.hqSites + inputs.dcSites + inputs.drSites;
    
    // Latency & BDP Calculations
    // BDP = Bandwidth (bps) * RTT (s)
    const bdpBits = (inputs.totalWanBw * 1000000) * (inputs.latencyRtt / 1000);
    // TCP Throughput Limit (Mbps) = (WindowSize in bits) / (RTT in seconds) / 1,000,000
    const throughputLimitMbps = inputs.latencyRtt > 0 
      ? (inputs.tcpWindowSize * 1024 * 8) / (inputs.latencyRtt / 1000) / 1000000 
      : inputs.totalWanBw;
    
    const effectiveBwUnoptimized = Math.min(inputs.totalWanBw, throughputLimitMbps);

    // Bandwidth Cost Calculation
    const avgMonthlyCostPerMbps = (inputs.mplsMonthlyCostPerMbps * (inputs.mplsPercentage / 100)) + 
                                  (inputs.internetMonthlyCostPerMbps * (1 - inputs.mplsPercentage / 100));
    
    // Use Total WAN BW for the ISP Upgrade Path (The "Do Nothing" baseline)
    const baseAnnualCostISP = inputs.totalWanBw * avgMonthlyCostPerMbps * 12;
    
    // Use Max TCP Throughput (effectiveBwUnoptimized) for the Riverbed Path calculation
    const baseAnnualCostRiverbed = effectiveBwUnoptimized * avgMonthlyCostPerMbps * 12;

    // Total Annual Savings (Year 1) = (Cost of ISP Path * 2) - Cost of Optimized Riverbed Path
    // This includes both the "avoided cost" of unused bandwidth and the optimization gain
    const baseAnnualSavings = (baseAnnualCostISP * 2) - (baseAnnualCostRiverbed * (1 - (inputs.optimizationPercentage / 100)));
    
    // Optimized Effective BW factors in Data Reduction applied to the bottlenecked throughput
    const effectiveBwOptimized = effectiveBwUnoptimized / (1 - (inputs.optimizationPercentage / 100));

    // Investment Calculation
    const oneTimeInvestment = inputs.totalHwCost + inputs.professionalServicesCost;
    const annualRecurringCost = inputs.totalSupportCost + inputs.totalLicenseCost;
    const totalInvestment = oneTimeInvestment + (annualRecurringCost * inputs.supportYears);

    // For Breakdown Chart
    const hwComponent = inputs.totalHwCost;
    const psComponent = inputs.professionalServicesCost;
    const licenseComponent = inputs.totalLicenseCost * inputs.supportYears;
    const supportComponent = inputs.totalSupportCost * inputs.supportYears;

    const growthFactor = 1 + (inputs.bwGrowthPercentage / 100);

    const calculateGross = (years: number) => {
      let cumulativeISP = 0;
      let annualISP = baseAnnualCostISP * 2;
      
      let cumulativeRiverbed = 0;
      let annualBWRiverbed = baseAnnualCostISP;
      
      for (let i = 1; i <= years; i++) {
        // ISP Path Logic: Year 1 = Base * 2, then grows by growthFactor each year
        cumulativeISP += annualISP;
        
        // Riverbed Path Logic
        if (i === 1) {
          cumulativeRiverbed = annualBWRiverbed + oneTimeInvestment + annualRecurringCost;
        } else {
          annualBWRiverbed *= growthFactor;
          cumulativeRiverbed += annualBWRiverbed + annualRecurringCost;
        }

        annualISP *= growthFactor;
      }
      
      return cumulativeISP - cumulativeRiverbed;
    };

    const calculateTCO = (years: number) => oneTimeInvestment + (annualRecurringCost * years);
    
    const calculateROI = (years: number) => {
      const gross = calculateGross(years);
      const tco = calculateTCO(years);
      return tco > 0 ? ((gross - tco) / tco) * 100 : 0;
    };

    const grossSavings1Yr = calculateGross(1);
    const grossSavings3Yr = calculateGross(3);
    const grossSavings5Yr = calculateGross(5);
    const tco5Yr = calculateTCO(5);

    // Productivity Gain Calculations
    // Logic:
    // 1. Total work hours per year for all Employees = No. of Employees x 264 x 8
    // 2. Network impacted hours = Total work hours per year for all Employees x Network Impact Factor %
    // 3. Hrs Gained by Riverbed Steelhead Solution = Network impacted hours x optimization %
    // 4. Productivity Gain ($) per year for all Employees = Hrs Gained by Riverbed Steelhead Solution x Avg hourly rate
    const calculateProductivity = (years: number) => {
      const totalWorkHoursPerYear = inputs.numUsers * 264 * 8;
      const networkImpactedHours = totalWorkHoursPerYear * (inputs.networkImpactFactor / 100);
      const hrsGainedByRiverbed = networkImpactedHours * (inputs.optimizationPercentage / 100);
      const annualGain = hrsGainedByRiverbed * inputs.avgHourlyRate;
      return annualGain * years;
    };

    const productivityGain1Yr = calculateProductivity(1);
    const productivityGain2Yr = calculateProductivity(2);
    const productivityGain3Yr = calculateProductivity(3);
    const productivityGain4Yr = calculateProductivity(4);
    const productivityGain5Yr = calculateProductivity(5);

    // Annual (YOY) Calculations
    const annualISPValues = [];
    let currentAnnualISP = baseAnnualCostISP * 2;
    for (let i = 1; i <= inputs.supportYears; i++) {
      annualISPValues.push(currentAnnualISP);
      currentAnnualISP *= growthFactor;
    }

    const annualRiverbedValues = [];
    let currentAnnualBWRiverbed = baseAnnualCostISP;
    for (let i = 1; i <= inputs.supportYears; i++) {
      if (i === 1) {
        annualRiverbedValues.push(currentAnnualBWRiverbed + oneTimeInvestment + annualRecurringCost);
      } else {
        currentAnnualBWRiverbed *= growthFactor;
        annualRiverbedValues.push(currentAnnualBWRiverbed + annualRecurringCost);
      }
    }

    const annualGrossSavings = annualISPValues.map((isp, i) => isp - annualRiverbedValues[i]);
    const annualTCO = Array.from({ length: inputs.supportYears }, (_, i) => 
      i === 0 ? oneTimeInvestment + annualRecurringCost : annualRecurringCost
    );
    const annualNetSavings = annualGrossSavings.map((gs, i) => gs - annualTCO[i]);
    const annualROI = annualNetSavings.map((ns, i) => (annualTCO[i] > 0 ? (ns / annualTCO[i]) * 100 : 0));
    const annualProductivity = Array.from({ length: inputs.supportYears }, () => productivityGain1Yr);

    // Hours Gained Calculation
    const totalWorkHoursPerYear = inputs.numUsers * 264 * 8;
    const networkImpactedHours = totalWorkHoursPerYear * (inputs.networkImpactFactor / 100);
    const hoursGained1Yr = networkImpactedHours * (inputs.optimizationPercentage / 100);

    // Income Protected Calculation
    const incomeProtected = inputs.totalCustomers * (inputs.churnReduction / 100) * inputs.annualOperatingIncomePerCustomer * inputs.supportYears;

    // Cumulative Spend Comparison
    const optRate = inputs.optimizationPercentage / 100;
    const riverbedSpendData = [];
    const yoyFinancialData = [];
    
    let cumulativeISP = 0;
    let annualISP = baseAnnualCostISP * 2;
    
    let cumulativeRiverbed = 0;
    let annualBWRiverbed = baseAnnualCostISP;
    
    let cumulativeInvestment = 0;
    let cumulativeProductivity = 0;

    for (let i = 1; i <= inputs.supportYears; i++) {
      // ISP Path Logic: Year 1 = Base * 2, then grows by growthFactor each year
      // Formula: Yr N = Yr(N-1) * (1 + Growth %)
      cumulativeISP += annualISP;
      
      let currentYearRiverbedCost = 0;
      // Riverbed Path Logic: 
      // 1st yr = total bw cost + riverbed HW cost + professional service cost + 1st yr license cost + 1st yr support cost
      // Yr N = {Yr(N-1) BW Cost * (1 + Growth %)} + license cost + support cost
      if (i === 1) {
        currentYearRiverbedCost = annualBWRiverbed + oneTimeInvestment + annualRecurringCost;
        cumulativeRiverbed = currentYearRiverbedCost;
        cumulativeInvestment = oneTimeInvestment + annualRecurringCost;
      } else {
        annualBWRiverbed *= growthFactor;
        currentYearRiverbedCost = annualBWRiverbed + annualRecurringCost;
        cumulativeRiverbed += currentYearRiverbedCost;
        cumulativeInvestment += annualRecurringCost;
      }
      
      cumulativeProductivity += productivityGain1Yr;

      const hardSavings = cumulativeISP - cumulativeRiverbed;
      const totalSavings = hardSavings + cumulativeProductivity;

      const yearName = `${i} yr${i > 1 ? 's' : ''}`;
      const yearLabel = i === 1 ? '1st yr' : i === 2 ? '2nd yr' : i === 3 ? '3rd yr' : i === 4 ? '4th yr' : '5th yr';

      riverbedSpendData.push({
        name: yearName,
        ISP: cumulativeISP,
        Riverbed: cumulativeRiverbed,
        Investment: cumulativeInvestment,
        HardSavings: hardSavings,
        TotalSavings: totalSavings
      });

      yoyFinancialData.push({
        name: yearLabel,
        ISP: annualISP,
        Riverbed: currentYearRiverbedCost
      });

      annualISP *= growthFactor;
    }

    // Payback Period = 1st Year Investment / (Hard Savings / 12)
    // Monthly Net Savings = Hard Savings / 12
    const firstYrISPPathCost = baseAnnualCostISP * 2;
    const firstYrRVBDPathCost = baseAnnualCostISP + oneTimeInvestment + annualRecurringCost;
    const hardSavings1Yr = firstYrISPPathCost - firstYrRVBDPathCost;
    const monthlyNetSavings = hardSavings1Yr / 12;
    const firstYrInvestment = oneTimeInvestment + annualRecurringCost;
    const paybackMonths = monthlyNetSavings > 0 ? (firstYrInvestment / monthlyNetSavings) : 0;

    return {
      currentAnnualCost: baseAnnualCostISP,
      optimizedAnnualCost: baseAnnualCostRiverbed * (1 - optRate),
      annualSavings: grossSavings1Yr,
      oneTimeInvestment,
      annualRecurringCost,
      totalInvestment,
      annualGrossSavings,
      annualTCO,
      paybackMonths,
      hwComponent,
      psComponent,
      licenseComponent,
      supportComponent,
      roi1Yr: calculateROI(1),
      roi2Yr: calculateROI(2),
      roi3Yr: calculateROI(3),
      roi4Yr: calculateROI(4),
      roi5Yr: calculateROI(5),
      tco1Yr: calculateTCO(1),
      tco2Yr: calculateTCO(2),
      tco3Yr: calculateTCO(3),
      tco4Yr: calculateTCO(4),
      tco5Yr,
      grossSavings1Yr,
      grossSavings2Yr: calculateGross(2),
      grossSavings3Yr,
      grossSavings4Yr: calculateGross(4),
      grossSavings5Yr,
      netSavings5Yr: grossSavings5Yr - tco5Yr,
      productivityGain1Yr,
      productivityGain2Yr: calculateProductivity(2),
      productivityGain3Yr,
      productivityGain4Yr: calculateProductivity(4),
      productivityGain5Yr,
      netSavingsPeriod: calculateGross(inputs.supportYears) - calculateTCO(inputs.supportYears),
      roiPeriod: calculateROI(inputs.supportYears),
      tcoPeriod: calculateTCO(inputs.supportYears),
      grossSavingsPeriod: calculateGross(inputs.supportYears),
      productivityGainPeriod: calculateProductivity(inputs.supportYears),
      hoursGainedPeriod: hoursGained1Yr * inputs.supportYears,
      incomeProtected,
      riverbedSpendData,
      yoyFinancialData,
      effectiveBwUnoptimized,
      effectiveBwOptimized,
      bdpBits,
      throughputLimitMbps,
      annualData: {
        tco: annualTCO,
        grossSavings: annualGrossSavings,
        netSavings: annualNetSavings,
        productivity: annualProductivity,
        roi: annualROI
      }
    };
  }, [inputs]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const chartData = metrics.riverbedSpendData.map(d => ({
    name: d.name,
    Investment: d.Investment,
    HardSavings: d.HardSavings
  }));

  const costBreakdownData = [
    { name: 'Hardware', value: metrics.hwComponent },
    { name: 'Prof. Services', value: metrics.psComponent },
    { name: 'License', value: metrics.licenseComponent },
    { name: 'Support', value: metrics.supportComponent },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'];
  const YOY_COLORS = ['#94a3b8', '#3b82f6'];

  return (
    <div id="roi-dashboard-root" className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Header */}
      <header className="bg-white border-b-4 border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center">
              <img 
                src="https://www.riverbed.com/favicon.ico" 
                alt="Riverbed" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('favicon.ico')) {
                    target.src = 'https://logo.clearbit.com/riverbed.com';
                  } else if (target.src.includes('clearbit')) {
                    target.src = 'https://www.riverbed.com/content/dam/riverbed/logo-riverbed.svg';
                  } else {
                    target.style.display = 'none';
                  }
                }}
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 
                className="text-xl font-bold tracking-tight bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #8E2DE2 50%, #F97316 100%)'
                }}
              >
                Steelhead ROI
              </h1>
              <p className="text-xs text-zinc-600 font-medium uppercase tracking-wider">WAN Optimization Business Case</p>
            </div>
          </div>
          <div id="download-button-container" className="flex items-center gap-4">
            <button
              onClick={downloadPDF}
              disabled={isDownloading}
              className="px-4 py-2 rounded-lg text-white font-bold text-sm shadow-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #8E2DE2 50%, #F97316 100%)'
              }}
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                'Download Report'
              )}
            </button>
          </div>
        </div>
      </header>

      <main id="report-content" className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top Metrics Grid - Now in the first row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricCard 
            label="ROI" 
            value={`${(((metrics.annualGrossSavings.reduce((a, b) => a + b, 0) - metrics.annualTCO.reduce((a, b) => a + b, 0)) / metrics.annualTCO.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%`} 
            subValue={`Total Return on Investment`}
            icon={TrendingUp}
            color="green"
          />
          <MetricCard 
            label="Payback Period" 
            value={`${metrics.paybackMonths.toFixed(1)} Months`} 
            subValue={`Break-even in Year ${Math.ceil(metrics.paybackMonths / 12)}`}
            icon={Clock}
            color="brown"
          />
          <MetricCard 
            label="Hard Savings" 
            value={formatCurrency(metrics.grossSavingsPeriod)} 
            subValue={`Cumulative ${inputs.supportYears}Y BW OpEx Reduction`}
            icon={DollarSign}
            color="blue"
          />
          <MetricCard 
            label="Productivity Gain" 
            value={formatCurrency(metrics.productivityGainPeriod)} 
            subValue={`Cumulative ${inputs.supportYears}Y Value`}
            icon={DollarSign}
            color="purple"
          />
          <MetricCard 
            label="Hrs Gained (Steelhead)" 
            value={`${Math.round(metrics.hoursGainedPeriod).toLocaleString()} Hrs`} 
            subValue={`Total over ${inputs.supportYears}Y Period`}
            icon={Clock}
            color="green"
          />
          <MetricCard 
            label="Income Protected" 
            value={formatCurrency(metrics.incomeProtected)} 
            subValue={`With Churn Reduction`}
            icon={ShieldCheck}
            color="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white border-4 border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calculator className="text-blue-600" size={20} />
                  <h2 className="font-bold text-zinc-800">Configuration Parameters</h2>
                </div>
                <button 
                  onClick={handleReset}
                  className="text-[10px] font-bold text-zinc-400 hover:text-rose-500 uppercase tracking-wider transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                {/* Licensing Model Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Licensing Model</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      className="py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest text-white shadow-lg border-none"
                      style={{ 
                        background: 'linear-gradient(135deg, #7C3AED 0%, #8E2DE2 50%, #F97316 100%)'
                      }}
                    >
                      FLEX (Subscription)
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">
                    HW (One-time), License + Support (Annual)
                  </p>
                </div>

                {/* Support Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Analysis Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 3, 5].map((yr) => (
                      <button
                        key={yr}
                        onClick={() => setInputs({ ...inputs, supportYears: yr as any })}
                        className={cn(
                          "py-2 text-sm font-bold rounded-lg border transition-all",
                          inputs.supportYears === yr 
                            ? "text-white border-none shadow-lg" 
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                        )}
                        style={inputs.supportYears === yr ? { 
                          background: 'linear-gradient(135deg, #7C3AED 0%, #8E2DE2 50%, #F97316 100%)'
                        } : {}}
                      >
                        {yr}Y
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Branch Sites" value={inputs.branchSites} onChange={(v: number) => setInputs({ ...inputs, branchSites: v })} icon={Building2} />
                  <InputField label="HQ Sites" value={inputs.hqSites} onChange={(v: number) => setInputs({ ...inputs, hqSites: v })} icon={Building2} />
                  <InputField label="DC Sites" value={inputs.dcSites} onChange={(v: number) => setInputs({ ...inputs, dcSites: v })} icon={Database} />
                  <InputField label="DR Sites" value={inputs.drSites} onChange={(v: number) => setInputs({ ...inputs, drSites: v })} icon={ShieldCheck} />
                </div>

                <InputField label="Total WAN BW" value={inputs.totalWanBw} onChange={(v: number) => setInputs({ ...inputs, totalWanBw: v })} icon={Network} suffix="Mbps" />

                <div className="pt-4 border-t-4 border-zinc-100 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Network Latency & Throughput</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <InputField 
                        label="Round Trip Time (RTT)" 
                        value={inputs.latencyRtt} 
                        onChange={(v: number) => setInputs({ ...inputs, latencyRtt: v })} 
                        icon={Clock}
                        suffix="ms"
                      />
                      <input 
                        type="range" 
                        min="1" 
                        max="1000" 
                        step="1"
                        value={inputs.latencyRtt}
                        onChange={(e) => setInputs({ ...inputs, latencyRtt: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck size={12} className="text-zinc-400" />
                          TCP Window Size
                        </label>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border-4 border-blue-100">
                          {inputs.tcpWindowSize} KB
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={TCP_WINDOW_SIZES.length - 1} 
                        step="1"
                        value={TCP_WINDOW_SIZES.indexOf(inputs.tcpWindowSize) === -1 ? 0 : TCP_WINDOW_SIZES.indexOf(inputs.tcpWindowSize)}
                        onChange={(e) => setInputs({ ...inputs, tcpWindowSize: TCP_WINDOW_SIZES[parseInt(e.target.value)] })}
                        className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between text-[8px] font-bold text-zinc-400 px-1">
                        <span>64K</span>
                        <span>32M</span>
                      </div>
                    </div>
                    <div className="bg-zinc-50 p-3 rounded-lg border-4 border-zinc-100 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase">
                        <span>Max TCP Throughput</span>
                        <span className="text-zinc-900 normal-case">{metrics.throughputLimitMbps.toFixed(2)} Mbps</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            (() => {
                              const pct = (metrics.throughputLimitMbps / inputs.totalWanBw) * 100;
                              if (pct >= 81) return "bg-emerald-500";
                              if (pct >= 50) return "bg-amber-500";
                              return "bg-rose-500";
                            })()
                          )}
                          style={{ width: `${Math.min(100, (metrics.throughputLimitMbps / inputs.totalWanBw) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-tight">
                        { (metrics.throughputLimitMbps / inputs.totalWanBw) < 0.99 
                          ? "TCP Throughput is limited by latency and window size." 
                          : "TCP Throughput is utilizing full link capacity." }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-4 border-zinc-100 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Investment Costs</h3>
                  
                  <div className="space-y-3">
                    <InputField 
                      label="Total Hardware Cost" 
                      value={inputs.totalHwCost} 
                      onChange={(v: number) => setInputs({ ...inputs, totalHwCost: v })} 
                      icon={Server}
                      suffix="USD"
                    />
                    <InputField 
                      label="Total License Cost" 
                      value={inputs.totalLicenseCost} 
                      onChange={(v: number) => setInputs({ ...inputs, totalLicenseCost: v })} 
                      icon={ShieldCheck}
                      suffix="USD / Year"
                    />
                    <InputField 
                      label="Annual Support Cost" 
                      value={inputs.totalSupportCost} 
                      onChange={(v: number) => setInputs({ ...inputs, totalSupportCost: v })} 
                      icon={ShieldCheck}
                      suffix="USD / Year"
                    />
                    <InputField 
                      label="Professional Services" 
                      value={inputs.professionalServicesCost} 
                      onChange={(v: number) => setInputs({ ...inputs, professionalServicesCost: v })} 
                      icon={ShieldCheck}
                      suffix="USD"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t-4 border-zinc-100 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Optimization Performance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-600 uppercase">
                      <span>Riverbed Optimization</span>
                      <span>{inputs.optimizationPercentage}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="95" 
                      step="5"
                      value={inputs.optimizationPercentage}
                      onChange={(e) => setInputs({ ...inputs, optimizationPercentage: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <p className="text-[10px] text-zinc-400 italic">
                      Expected data reduction rate (Deduplication + Compression).
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t-4 border-zinc-100 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Capacity Planning</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-600 uppercase">
                      <span>Annual BW Growth</span>
                      <span>{inputs.bwGrowthPercentage}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={inputs.bwGrowthPercentage}
                      onChange={(e) => setInputs({ ...inputs, bwGrowthPercentage: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <p className="text-[10px] text-zinc-400 italic">
                      Simulates compounding bandwidth demand over time.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t-4 border-zinc-100 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Connectivity Costs</h3>
                  <InputField 
                    label="MPLS Cost / Mbps" 
                    value={inputs.mplsMonthlyCostPerMbps} 
                    onChange={(v: number) => setInputs({ ...inputs, mplsMonthlyCostPerMbps: v })}
                    icon={DollarSign}
                    suffix="/ mo"
                  />
                  <InputField 
                    label="Internet Cost / Mbps" 
                    value={inputs.internetMonthlyCostPerMbps} 
                    onChange={(v: number) => setInputs({ ...inputs, internetMonthlyCostPerMbps: v })}
                    icon={DollarSign}
                    suffix="/ mo"
                  />
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-600 uppercase">
                      <span>MPLS Mix</span>
                      <span>{inputs.mplsPercentage}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={inputs.mplsPercentage}
                      onChange={(e) => setInputs({ ...inputs, mplsPercentage: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t-4 border-zinc-100 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Productivity Gain</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField 
                      label="Number of Users" 
                      value={inputs.numUsers} 
                      onChange={(v: number) => setInputs({ ...inputs, numUsers: v })} 
                      icon={Building2} 
                      suffix="Employees" 
                    />
                    <InputField 
                      label="Avg Hourly Rate" 
                      value={inputs.avgHourlyRate} 
                      onChange={(v: number) => setInputs({ ...inputs, avgHourlyRate: v })} 
                      icon={DollarSign} 
                      suffix="/ hr" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Network size={12} className="text-zinc-400" />
                        Network Impact Factor
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={inputs.networkImpactFactor}
                          onChange={(e) => setInputs({ ...inputs, networkImpactFactor: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                          className="w-12 text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border-4 border-blue-100 text-center"
                        />
                        <span className="text-[10px] font-bold text-zinc-400">%</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="1"
                      value={inputs.networkImpactFactor}
                      onChange={(e) => setInputs({ ...inputs, networkImpactFactor: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <p className="text-[10px] text-zinc-400 italic">
                      Logic: (Total Annual Hours × Impact Factor % × Optimization %) × Hourly Rate.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t-4 border-zinc-100 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Income Protection by reducing Churn</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 size={12} className="text-zinc-400" />
                          Total customers
                        </label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={inputs.totalCustomers}
                            onChange={(e) => setInputs({ ...inputs, totalCustomers: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-24 text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border-4 border-blue-100 text-center"
                          />
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100000" 
                        step="100"
                        value={inputs.totalCustomers}
                        onChange={(e) => setInputs({ ...inputs, totalCustomers: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp size={12} className="text-zinc-400" />
                          Churn Reduction
                        </label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={inputs.churnReduction}
                            onChange={(e) => setInputs({ ...inputs, churnReduction: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                            className="w-12 text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border-4 border-blue-100 text-center"
                          />
                          <span className="text-[10px] font-bold text-zinc-400">% /YEAR</span>
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="0.1"
                        value={inputs.churnReduction}
                        onChange={(e) => setInputs({ ...inputs, churnReduction: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign size={12} className="text-zinc-400" />
                          Annual operating income per customer
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-400">$</span>
                          <input 
                            type="number"
                            value={inputs.annualOperatingIncomePerCustomer}
                            onChange={(e) => setInputs({ ...inputs, annualOperatingIncomePerCustomer: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-20 text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border-4 border-blue-100 text-center"
                          />
                          <span className="text-[10px] font-bold text-zinc-400">/YEAR</span>
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100000" 
                        step="100"
                        value={inputs.annualOperatingIncomePerCustomer}
                        onChange={(e) => setInputs({ ...inputs, annualOperatingIncomePerCustomer: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div 
              className="rounded-2xl p-6 text-white shadow-xl"
              style={{ 
                background: 'linear-gradient(135deg, #7C3AED 0%, #8E2DE2 50%, #F97316 100%)',
                boxShadow: '0 20px 25px -5px rgba(142, 45, 226, 0.2)'
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} />
                <h3 className="font-bold text-white">Steelhead Advantage</h3>
              </div>
              <p className="text-sm text-white/90 leading-relaxed mb-4">
                Riverbed Steelhead reduces WAN traffic by an average of <span className="font-black text-amber-400 text-lg mx-1 drop-shadow-sm">{inputs.optimizationPercentage}%</span> through advanced data deduplication and application-specific latency optimization.
              </p>
              <ul className="text-xs space-y-2 text-white/80">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  Bandwidth Deferral (Avoid Upgrades)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  Productivity Gains (Faster Apps)
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* TCO Breakdown */}
              <div className="bg-white border-4 border-zinc-200 rounded-2xl p-6 shadow-sm xl:col-span-2">
                <h3 className="font-bold text-zinc-800 mb-6">Investment Breakdown</h3>
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="w-full lg:w-1/2 space-y-4">
                    {costBreakdownData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                          <span className="text-sm font-medium text-zinc-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t-4 border-zinc-100 flex justify-between">
                      <span className="text-sm font-bold text-zinc-900">Total</span>
                      <span className="text-sm font-bold text-blue-600">{formatCurrency(metrics.totalInvestment)}</span>
                    </div>
                  </div>
                  <div className="h-[350px] w-full lg:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <Pie
                          data={costBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Cumulative Cost Projection Chart */}
              <div className="bg-white border-4 border-zinc-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-zinc-800">Cumulative Cost Projection</h3>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Riverbed vs. ISP Bandwidth Upgrade</p>
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                      <span>RVBD Path</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-zinc-400" />
                      <span>ISP Upgrade Path</span>
                    </div>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.riverbedSpendData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(val) => `$${val/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                      <Line type="monotone" dataKey="ISP" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Riverbed" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Investment vs Hard Savings Chart */}
              <div className="bg-white border-4 border-zinc-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-bold text-zinc-800">Investment vs. Hard Savings</h3>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                      <span>Investment</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      <span>Hard Savings</span>
                    </div>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(val) => `$${val/1000}k`}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                      <Bar dataKey="Investment" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar dataKey="HardSavings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* YoY Financial Summary Table */}
            <div className="bg-white border-4 border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b-4 border-zinc-100 bg-zinc-50/50">
                <h3 className="font-bold text-zinc-800">YoY Financial Summary (Annual)</h3>
              </div>
              <div className="flex flex-col lg:flex-row items-center gap-8 p-6">
                <div className="w-full lg:w-1/2 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white">
                        <th className="px-6 py-4">Years</th>
                        <th className="px-6 py-4">ISP Upgrade Path Cost</th>
                        <th className="px-6 py-4">RVBD Path Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-zinc-100">
                      {metrics.yoyFinancialData.map((data) => (
                        <tr key={data.name}>
                          <td className="px-6 py-4 font-medium text-zinc-600 whitespace-nowrap">{data.name}</td>
                          <td className="px-6 py-4 font-bold text-zinc-400">{formatCurrency(data.ISP)}</td>
                          <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(data.Riverbed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="h-[300px] w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.yoyFinancialData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(val) => `$${val/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                      <Line type="monotone" dataKey="ISP" stroke={YOY_COLORS[0]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="ISP Upgrade Path Cost" />
                      <Line type="monotone" dataKey="Riverbed" stroke={YOY_COLORS[1]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="RVBD Path Cost" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: YOY_COLORS[0] }} />
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">ISP Upgrade Path Cost</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: YOY_COLORS[1] }} />
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">RVBD Path Cost</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Year Cumulative Financial Summary Table */}
            <div className="bg-white border-4 border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b-4 border-zinc-100 bg-zinc-50/50">
                <h3 className="font-bold text-zinc-800">Multi-Year Cumulative Financial Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white">
                      <th className="px-6 py-4">Years</th>
                      <th className="px-6 py-4">ISP Upgrade Cumulative Cost</th>
                      <th className="px-6 py-4">RVBD Cumulative Cost</th>
                      <th className="px-6 py-4">Investment</th>
                      <th className="px-6 py-4">Hard Savings</th>
                      <th className="px-6 py-4">TOTAL SAVINGS (including Productivity Gain)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-zinc-100">
                    {metrics.riverbedSpendData.map((data) => (
                      <tr key={data.name}>
                        <td className="px-6 py-4 font-medium text-zinc-600 whitespace-nowrap">{data.name}</td>
                        <td className="px-6 py-4 font-bold text-zinc-400">{formatCurrency(data.ISP)}</td>
                        <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(data.Riverbed)}</td>
                        <td className="px-6 py-4 font-bold text-zinc-600">{formatCurrency(data.Investment)}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(data.HardSavings)}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600">{formatCurrency(data.TotalSavings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ROI Formula Explanation */}
            <div className="bg-white border-4 border-zinc-200 rounded-2xl p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Calculator size={20} />
                </div>
                <h3 className="text-xl font-bold text-zinc-800">Methodology</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 border-l-4 border-blue-500 pl-3">The ROI % Formula</h4>
                  <div className="bg-zinc-50 p-4 rounded-xl border-4 border-zinc-100 font-mono text-sm text-blue-700">
                    ROI % = (Total Hard Savings - Total Investment) / Total Investment x 100
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {metrics.annualGrossSavings?.length > 0 && metrics.annualTCO?.length > 0 ? (
                      `Example: If Total Savings is ${formatCurrency(metrics.annualGrossSavings.reduce((a, b) => a + b, 0))} and Total Investment is ${formatCurrency(metrics.annualTCO.reduce((a, b) => a + b, 0))}, ROI % = (${formatCurrency(metrics.annualGrossSavings.reduce((a, b) => a + b, 0))} - ${formatCurrency(metrics.annualTCO.reduce((a, b) => a + b, 0))}) / ${formatCurrency(metrics.annualTCO.reduce((a, b) => a + b, 0))} x 100 = ${(((metrics.annualGrossSavings.reduce((a, b) => a + b, 0) - metrics.annualTCO.reduce((a, b) => a + b, 0)) / metrics.annualTCO.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%.`
                    ) : (
                      "Example calculation not available."
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 border-l-4 border-emerald-500 pl-3">Payback Period</h4>
                  <div className="bg-zinc-50 p-4 rounded-xl border-4 border-zinc-100 font-mono text-sm text-emerald-700">
                    Payback Period = 1st Year Investment / (Hard Savings / 12)
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {metrics.annualGrossSavings?.length > 0 && metrics.annualTCO?.length > 0 ? (
                      `Example: If 1st Year Investment is ${formatCurrency(metrics.annualTCO[0])} and Hard Savings is ${formatCurrency(metrics.annualGrossSavings[0])}, Monthly Net Savings = ${formatCurrency(metrics.annualGrossSavings[0] / 12)}. Payback Period = ${formatCurrency(metrics.annualTCO[0])} / ${formatCurrency(metrics.annualGrossSavings[0] / 12)} = ${(metrics.annualTCO[0] / (metrics.annualGrossSavings[0] / 12)).toFixed(1)} months.`
                    ) : (
                      "Example calculation not available."
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 border-l-4 border-blue-600 pl-3">Cumulative Cost Logic</h4>
                  <div className="bg-zinc-50 p-4 rounded-xl border-4 border-zinc-100 font-mono text-sm text-blue-700 space-y-2">
                    <p>ISP Path (Yr1) = (Total WAN BW × 2) × Price × 12</p>
                    <p>ISP Path (Yr N) = Yr(N-1) + {"{"}Annual Cost Yr(N-1) × (1 + Growth %){"}"}</p>
                    <p>Riverbed Path (Yr1) = (Total WAN BW × Price × 12) + CapEx + OpEx + Prof. Services</p>
                    <p>Riverbed Path (Yr N) = Yr(N-1) + {"{"}Annual BW Cost Yr(N-1) × (1 + Growth %){"}"} + OpEx</p>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    This tracks the total cash outlay over time. The "Riverbed Path" includes the initial hardware investment plus ongoing support, while the "ISP Path" represents the escalating costs of buying more bandwidth to meet growth.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 border-l-4 border-indigo-500 pl-3">Effective Bandwidth</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Standard TCP is limited by <strong className="text-zinc-700">Throughput ≤ Window Size / RTT</strong>. On high-latency links, your "Effective BW" is often a fraction of your paid link speed.
                  </p>
                  <div className="bg-zinc-50 p-3 rounded-xl border-4 border-zinc-100 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-zinc-600">Max TCP Throughput (Un-optimized)</span>
                      <span className="text-rose-600">{metrics.effectiveBwUnoptimized.toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-zinc-600">RIVERBED EFFECTIVE THROUGHPUT (Optimized)</span>
                      <span className="text-emerald-600">{metrics.effectiveBwOptimized.toFixed(0)} Mbps</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 border-l-4 border-amber-500 pl-3">Income Protection by Churn Reduction Logic</h4>
                  <div className="bg-zinc-50 p-4 rounded-xl border-4 border-zinc-100 font-mono text-sm text-amber-700 space-y-2">
                    <p>Income Protected = Total Customers × (Churn Reduction / 100) × Annual Operating Income per Customer × Analysis Period</p>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Example: {inputs.totalCustomers.toLocaleString()} Customers × ({inputs.churnReduction}% / 100) × {formatCurrency(inputs.annualOperatingIncomePerCustomer)} × {inputs.supportYears} Yrs = {formatCurrency(metrics.incomeProtected)}.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 border-l-4 border-indigo-500 pl-3">Capacity Planning</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Factoring in annual bandwidth growth significantly increases ROI, as optimization defers the need for costly link upgrades that would otherwise be required to meet growing data demands.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t-4 border-zinc-100">
                <h4 className="text-sm font-bold text-zinc-900 mb-4">Productivity & Cost Model Logic</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Employee Productivity Gain</p>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Calculated based on <strong className="text-zinc-900">{formatCurrency(inputs.avgHourlyRate)} USD/hour</strong> per employee. We assume a <strong className="text-zinc-900">{inputs.networkImpactFactor}% Network Impact Factor</strong> (time spent waiting for slow applications), which is then optimized by the Steelhead performance gain.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t-4 border-zinc-200 mt-12">
        <div className="flex flex-col items-center gap-6">
          <div className="w-5 h-5 flex items-center justify-center opacity-40 grayscale hover:grayscale-0 transition-all duration-300">
            <img 
              src="https://www.riverbed.com/favicon.ico" 
              alt="Riverbed" 
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('favicon.ico')) {
                  target.src = 'https://logo.clearbit.com/riverbed.com';
                } else {
                  target.style.display = 'none';
                }
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <ShieldCheck size={18} />
            <span className="text-xs font-medium uppercase tracking-wider">Enterprise Grade ROI Analysis</span>
          </div>
          
          <div className="w-full text-center space-y-4">
            <div className="pt-6 border-t-4 border-zinc-100">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                Developed by: Shahzad Hussain, Senior Pre-Sales Consultant, Starlink, Dubai - United Arab Emirates
              </p>
            </div>
            <p className="text-[10px] text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              Disclaimer: This calculator provides estimates based on industry averages and Riverbed Steelhead performance benchmarks. Actual results may vary based on specific network traffic patterns and application behavior.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
