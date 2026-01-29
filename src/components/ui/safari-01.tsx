"use client"

import Image, { StaticImageData } from "next/image"
import React from "react"
import { cn } from "@/lib/utils"

interface Safari_01Props {
  image?: StaticImageData | string
  className?: string
}

const Safari_01: React.FC<Safari_01Props> = ({ image, className }) => {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-zinc-300/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-sm",
        className
      )}
    >
      {/* Browser top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-300/50 dark:border-zinc-700/50 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-red-500 rounded-full shadow-sm ring-1 ring-red-600/20" />
          <span className="w-3 h-3 bg-yellow-400 rounded-full shadow-sm ring-1 ring-yellow-500/20" />
          <span className="w-3 h-3 bg-green-500 rounded-full shadow-sm ring-1 ring-green-600/20" />
        </div>
        <div className="flex-1 mx-4 bg-white dark:bg-zinc-800 rounded-lg h-7 max-w-md flex items-center justify-center px-4 shadow-inner border border-gray-200 dark:border-zinc-700">
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate animate-pulse">
            Click Here To View The Demo League!
          </span>
        </div>
        <div className="w-4 h-4" /> {/* Placeholder for right side icons */}
      </div>

      {/* Preview area */}
      <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 aspect-video flex items-center justify-center p-1 shadow-inner">
        {image ? (
          <Image
            src={image}
            alt="Preview"
            width={800}
            height={450}
            className="object-contain max-h-full max-w-full rounded-sm shadow-lg"
          />
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No preview image
          </div>
        )}
      </div>
    </div>
  )
}

export default Safari_01
