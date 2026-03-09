'use client';

export default function Page() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">ETL - VOLLEYBALL</h1>
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