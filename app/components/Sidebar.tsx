'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();

  const sections = [
    {
      title: 'Option Chain',
      items: [
        { name: 'NIFTY', path: '/' },
        { name: 'BANKNIFTY', path: '/banknifty' },
      ]
    },
    {
      title: 'Screener',
      items: [
        { name: 'Stocks', path: '/screener' },
      ]
    }
  ];

  return (
    <div className="w-48 min-h-screen bg-gray-50 border-r">
      <div className="p-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">{section.title}</h2>
            <nav className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    pathname === item.path
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar; 