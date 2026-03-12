'use client';

export default function Page() {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">ETL - Volleyball</h1>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="font-medium text-yellow-800 mb-1">Work in progress</div>
                <div className="text-sm text-yellow-700">This ETL page is not implemented yet. Use the main ETL page to manage imports and previews.</div>
                <div className="mt-2">
                    <a href="/admin/api/etl/football" className="text-blue-600 underline">Open ETL Football</a>
                </div>
            </div>
         </div>
        );
}