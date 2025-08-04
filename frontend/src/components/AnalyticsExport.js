import React, { useState, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import {
    DocumentDownloadIcon,
    ChartBarIcon,
    CalendarIcon,
    RefreshIcon,
    ExclamationCircleIcon
} from '@heroicons/react/outline';

const AnalyticsExport = () => {
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [format, setFormat] = useState('xlsx');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const downloadFile = useCallback((blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }, []);

    const handleExport = async () => {
        setError('');
        if (!startDate || !endDate) {
            setError('Please select both start and end dates');
            return;
        }

        if (startDate > endDate) {
            setError('Start date cannot be after end date');
            return;
        }

        try {
            setLoading(true);
            const filename = `analytics_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.${format}`;

            const response = await api.post('/analytics/export', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                format
            }, {
                responseType: format === 'xlsx' ? 'blob' : 'json'
            });

            if (format === 'xlsx') {
                const blob = new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                downloadFile(blob, filename);
            } else {
                const dataStr = JSON.stringify(response.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                downloadFile(blob, filename);
            }

            toast.success('Analytics exported successfully!', {
                duration: 3000,
                icon: '📊'
            });
        } catch (error) {
            console.error('Export error:', error);
            setError(error.response?.data?.message || 'Failed to export analytics');
            toast.error('Export failed. Please try again.', {
                duration: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow" role="region" aria-label="Analytics Export">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2" aria-hidden="true" />
                Export Analytics
            </h2>

            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded flex items-center">
                    <ExclamationCircleIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date
                    </label>
                    <div className="relative">
                        <DatePicker
                            id="start-date"
                            selected={startDate}
                            onChange={date => setStartDate(date)}
                            maxDate={endDate}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            aria-label="Select start date"
                        />
                        <CalendarIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" aria-hidden="true" />
                    </div>
                </div>

                <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Date
                    </label>
                    <div className="relative">
                        <DatePicker
                            id="end-date"
                            selected={endDate}
                            onChange={date => setEndDate(date)}
                            minDate={startDate}
                            maxDate={new Date()}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            aria-label="Select end date"
                        />
                        <CalendarIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" aria-hidden="true" />
                    </div>
                </div>
            </div>

            <fieldset className="mb-6">
                <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Export Format
                </legend>
                <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio text-blue-600"
                            name="format"
                            value="xlsx"
                            checked={format === 'xlsx'}
                            onChange={e => setFormat(e.target.value)}
                            aria-label="Excel format"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Excel (XLSX)</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio text-blue-600"
                            name="format"
                            value="json"
                            checked={format === 'json'}
                            onChange={e => setFormat(e.target.value)}
                            aria-label="JSON format"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">JSON</span>
                    </label>
                </div>
            </fieldset>

            <div className="flex justify-end">
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className={`
                        flex items-center px-4 py-2 rounded-lg text-white
                        ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                        transition-colors duration-200
                    `}
                    aria-busy={loading}
                >
                    {loading ? (
                        <RefreshIcon className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                    ) : (
                        <DocumentDownloadIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                    )}
                    {loading ? 'Exporting...' : 'Export Analytics'}
                </button>
            </div>

             <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <p>Export includes:</p>
                <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Match quality metrics</li>
                    <li>User interaction statistics</li>
                    <li>System performance data</li>
                    <li>ML model analytics</li>
                </ul>
            </div>

        </div>
    );
};

export default AnalyticsExport;