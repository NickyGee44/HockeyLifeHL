export default function TestStylesPage() {
  return (
    <div className="min-h-screen bg-blue-500 p-8">
      <h1 className="text-4xl font-bold text-white mb-4">
        🎨 CSS Test Page
      </h1>
      <div className="bg-white rounded-lg shadow-xl p-6 mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          White Card with Shadow
        </h2>
        <p className="text-gray-600">
          If you see:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li className="text-green-600">Blue background ✅</li>
          <li className="text-green-600">White card with shadow ✅</li>
          <li className="text-green-600">Colored text ✅</li>
          <li className="text-green-600">Proper spacing ✅</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500">
          Then Tailwind CSS is working correctly!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500 text-white p-4 rounded">Red</div>
        <div className="bg-green-500 text-white p-4 rounded">Green</div>
        <div className="bg-purple-500 text-white p-4 rounded">Purple</div>
      </div>
    </div>
  );
}
