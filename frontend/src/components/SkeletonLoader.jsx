const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="bg-gray-200 p-3 rounded-full w-12 h-12"></div>
            </div>
          </div>
        );

      case 'table-row':
        return (
          <tr className="animate-pulse">
            <td className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </td>
            <td className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </td>
            <td className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </td>
          </tr>
        );

      case 'list-item':
        return (
          <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
            </div>
          </div>
        );

      default:
        return (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  );
};

export default SkeletonLoader;
