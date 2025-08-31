'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Zap, 
  Globe, 
  Wind, 
  CloudRain, 
  Sun, 
  Eye, 
  Lightbulb,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react'

interface PollutionData {
  location: string
  aqi: number
  pm25: number
  pm10: number
  no2: number
  so2: number
  co: number
  o3: number
  Weather: string
  temperature: number
  humidity: number
}

interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

interface Particle {
  id: number
  left: number
  delay: number
  duration: number
}

const AirSenseAI: React.FC = () => {
  const [formData, setFormData] = useState<PollutionData>({
    location: '',
    aqi: 0,
    pm25: 0,
    pm10: 0,
    no2: 0,
    so2: 0,
    co: 0,
    o3: 0,
    Weather: 'Clear',
    temperature: 0,
    humidity: 0
  })

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [liveData, setLiveData] = useState<PollutionData | null>(null)
  const [liveRecommendations, setLiveRecommendations] = useState<Recommendation[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isFetchingLive, setIsFetchingLive] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  // Fetch live data
   useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4
    }))
    setParticles(newParticles)
  }, [])
  useEffect(() => {
    
    const fetchLiveData = async () => {
      setIsFetchingLive(true)
      try {
        const lat = 28.61
        const lon = 77.23
        const apiKey = '094dbfbe1fb7ad4fcd2aa0d875670a0b'

        // Air Pollution API
        const pollutionRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
        const pollutionData = await pollutionRes.json()

        // Weather API
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
        const weatherData = await weatherRes.json()

        if (!pollutionData.list || pollutionData.list.length === 0) {
          setLiveData(null)
          setLiveRecommendations([])
          return
        }

        const item = pollutionData.list[0]
        const mapWeatherToKnown = (weather: string) => {
  const knownLabels = ['Clear', 'Rain', 'Sunny', 'Snow']
  return knownLabels.includes(weather) ? weather : 'Clear'
}
        
const formatted: PollutionData = {
  location: 'Delhi',
  aqi: item.main.aqi,
  pm25: item.components.pm2_5,
  pm10: item.components.pm10,
  no2: item.components.no2,
  so2: item.components.so2,
  co: item.components.co,
  o3: item.components.o3,
  Weather: mapWeatherToKnown(weatherData.weather?.[0]?.main || 'Clear'),
  temperature: weatherData.main.temp, // correct numeric value
  humidity: weatherData.main.humidity
}

setLiveData(formatted)
console.log("Live data (frontend-friendly):", formatted)

// Convert for backend
const backendData = {
  AQI: formatted.aqi,
  'PM2.5': formatted.pm25,
  PM10: formatted.pm10,
  NO2: formatted.no2,
  SO2: formatted.so2,
  CO: formatted.co,
  O3: formatted.o3,
  Weather: formatted.Weather,
  'Temperature(C)': formatted.temperature,
  'Humidity(%)': formatted.humidity
}

console.log("Live data being sent to backend:", backendData)

// Send to backend for AI recommendations
const res = await fetch('http://localhost:5000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(backendData)
})

const result = await res.json()
console.log("Full backend response:", result)

        if (result?.Suggestions) {
          setLiveRecommendations(result.Suggestions.map((desc: string, idx: number) => ({
            title: `Recommendation ${idx + 1}`,
            description: desc,
            priority: getPriorityFromAirQuality(result.AirQuality)
          })))
        } else {
          setLiveRecommendations([])
        }
      } catch (err) {
        console.error(err)
        setLiveData(null)
        setLiveRecommendations([])
      } finally {
        setIsFetchingLive(false)
      }
    }

    fetchLiveData()
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'location' || name === 'weather' ? value : Number(value) || 0
    }))
  }

  const getPriorityFromAirQuality = (airQuality: string): 'high' | 'medium' | 'low' => {
    switch (airQuality) {
      case 'Good': return 'low'
      case 'Moderate': return 'medium'
      case 'Unhealthy for sensitive groups': return 'medium'
      case 'Unhealthy':
      case 'Very Unhealthy':
      case 'Hazardous':
        return 'high'
      default: return 'medium'
    }
  }

  const handleAnalyze = async () => {
    if (!formData.location || formData.aqi === 0) {
      alert('Please fill in all required fields')
      return
    }
    setIsAnalyzing(true)
    try {
      const backendData = {
        AQI: formData.aqi,
        'PM2.5': formData.pm25,
        PM10: formData.pm10,
        NO2: formData.no2,
        SO2: formData.so2,
        CO: formData.co,
        O3: formData.o3,
        Weather: formData.Weather,
        'Temperature(C)': formData.temperature,
        'Humidity(%)': formData.humidity
      }

      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData)
      })

      if (!response.ok) throw new Error('Failed to get predictions from backend')

      const result = await response.json()
      const backendRecommendations: Recommendation[] = result.Suggestions.map((desc: string, idx: number) => ({
        title: `${result.AirQuality} - Recommendation ${idx + 1}`,
        description: desc,
        priority: getPriorityFromAirQuality(result.AirQuality)
      }))

      setRecommendations(backendRecommendations)
    } catch (err) {
      console.error('Error calling backend:', err)
      alert('Failed to connect to AI model. Check if backend is running.')

      setRecommendations([{
        title: "Connection Error",
        description: "Unable to connect to AI backend. Ensure Flask server is running on localhost:5000",
        priority: 'high'
      }])
    } finally {
      setIsAnalyzing(false)
    }
  }
const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const navbarHeight = 64 // Height of the fixed navbar (h-16 = 4rem = 64px)
      const elementPosition = element.offsetTop - navbarHeight
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 border-red-500/50 text-red-300'
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
      case 'low': return 'bg-green-500/20 border-green-500/50 text-green-300'
      default: return 'bg-blue-500/20 border-blue-500/50 text-blue-300'
    }
  }

  return (
       <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-x-hidden">
      {/* Animated Background Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>
      

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-900/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Wind className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SkyPulse AI
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              <button onClick={() => scrollToSection('home')} className="text-gray-300 hover:text-white transition-colors duration-300">
                Home
              </button>
              <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white transition-colors duration-300">
                Features
              </button>
              <button onClick={() => scrollToSection('demo')} className="text-gray-300 hover:text-white transition-colors duration-300">
                Try
              </button>
              <button onClick={() => scrollToSection('contact')} className="text-gray-300 hover:text-white transition-colors duration-300">
                Contact
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="min-h-screen flex items-center justify-center relative pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="transform hover:scale-105 transition-transform duration-700">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              SkyPulse AI
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              Revolutionary AI-powered air pollution control system that provides intelligent, 
              real-time solutions for cleaner air and healthier environments
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => scrollToSection('demo')}
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full text-white font-semibold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-blue-500/25"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>Try SkyPulse</span>
                  <Zap className="w-5 h-5 group-hover:animate-bounce" />
                </span>
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="px-8 py-4 backdrop-blur-sm bg-white/10 border border-white/20 hover:border-white/40 hover:bg-white/20 rounded-full text-white font-semibold transform hover:scale-105 transition-all duration-300"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Smart Features
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Our AI analyzes environmental data and provides actionable insights for effective pollution control
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group backdrop-blur-sm bg-slate-800/30 p-8 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:animate-pulse">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-blue-400 transition-colors">Real-time Analysis</h3>
              <p className="text-gray-300">Advanced AI algorithms process environmental data in real-time to provide instant pollution assessments and recommendations.</p>
            </div>

            {/* Feature 2 */}
            <div className="group backdrop-blur-sm bg-slate-800/30 p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:animate-pulse">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-purple-400 transition-colors">Smart Recommendations</h3>
              <p className="text-gray-300">Get personalized, actionable suggestions based on your specific location, pollution levels, and environmental conditions.</p>
            </div>

            {/* Feature 3 */}
            <div className="group backdrop-blur-sm bg-slate-800/30 p-8 rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:animate-pulse">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-green-400 transition-colors">Global Impact</h3>
              <p className="text-gray-300">Track pollution patterns worldwide and contribute to a global network of environmental monitoring and improvement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-green-600/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Try Our AI Model
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Input your environmental data and get instant AI-powered pollution control recommendations
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="backdrop-blur-md bg-slate-800/40 rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Input Form */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Environmental Input
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>Location</span>
                      </label>
                      <input 
                        type="text" 
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Enter your city (e.g., Mumbai, Delhi)" 
                        className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                          <BarChart3 className="w-4 h-4" />
                          <span>AQI Level</span>
                        </label>
                        <input 
                          type="number" 
                          name="aqi"
                          value={formData.aqi || ''}
                          onChange={handleInputChange}
                          placeholder="0-500" 
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>PM2.5 (μg/m³)</span>
                        </label>
                        <input 
                          type="number" 
                          name="pm25"
                          value={formData.pm25 || ''}
                          onChange={handleInputChange}
                          placeholder="0-300" 
                          step="0.1"
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>PM10 (μg/m³)</span>
                        </label>
                        <input 
                          type="number" 
                          name="pm10"
                          value={formData.pm10 || ''}
                          onChange={handleInputChange}
                          placeholder="0-500" 
                          step="0.1"
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>NO2 (μg/m³)</span>
                        </label>
                        <input 
                          type="number" 
                          name="no2"
                          value={formData.no2 || ''}
                          onChange={handleInputChange}
                          placeholder="0-200" 
                          step="0.1"
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>SO2 (μg/m³)</span>
                        </label>
                        <input 
                          type="number" 
                          name="so2"
                          value={formData.so2 || ''}
                          onChange={handleInputChange}
                          placeholder="0-100" 
                          step="0.1"
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>CO (mg/m³)</span>
                        </label>
                        <input 
                          type="number" 
                          name="co"
                          value={formData.co || ''}
                          onChange={handleInputChange}
                          placeholder="0-10" 
                          step="0.01"
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>O3 (μg/m³)</span>
                        </label>
                        <input 
                          type="number" 
                          name="o3"
                          value={formData.o3 || ''}
                          onChange={handleInputChange}
                          placeholder="0-200" 
                          step="0.1"
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>Temperature (°C)</span>
                        </label>
                        <input 
                          type="number" 
                          name="temperature"
                          value={formData.temperature || ''}
                          onChange={handleInputChange}
                          placeholder="0-50" 
                          step="0.1"
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                          <CloudRain className="w-4 h-4" />
                          <span>Weather Conditions</span>
                        </label>
                        <select 
                          name="weather"
                          value={formData.Weather}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white transition-all duration-300"
                        >
                          <option value="Clear">Clear</option>
                          <option value="Cloudy">Cloudy</option>
                          <option value="Rainy">Rainy</option>
                          <option value="Windy">Windy</option>
                          <option value="Foggy">Foggy</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <span>Humidity (%)</span>
                        </label>
                        <input 
                          type="number" 
                          name="humidity"
                          value={formData.humidity || ''}
                          onChange={handleInputChange}
                          placeholder="0-100" 
                          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400 transition-all duration-300"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 rounded-lg text-white font-semibold transform hover:scale-105 disabled:scale-100 transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <span>Analyze & Get Recommendations</span>
                          <Zap className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Results Display */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    AI Recommendations
                  </h3>
                  <div className="bg-slate-700/30 rounded-lg p-6 min-h-96">
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="animate-pulse mb-4">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                          </div>
                          <p className="text-gray-400 text-lg">AI is analyzing your data...</p>
                        </div>
                      </div>
                    ) : recommendations.length > 0 ? (
                      <div className="space-y-4">
                        {recommendations.map((rec, index) => (
                          <div 
                            key={index}
                            className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)} transition-all duration-300 hover:scale-105`}
                          >
                            <h4 className="font-semibold mb-2 flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                              <span>{rec.title}</span>
                            </h4>
                            <p className="text-sm opacity-90">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                            <Lightbulb className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-gray-400 text-lg">Enter your data above to get personalized AI-powered pollution control recommendations</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
       {/* Demo Section - Live Recommendations */}
        {/* Live Data & Recommendations Section */}
<section className="py-20 relative">
  <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-blue-600/10 to-purple-600/10"></div>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="text-center mb-16">
      <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
        Live AI Recommendations
      </h2>
      <p className="text-gray-300 text-lg max-w-2xl mx-auto">
        Real-time  air quality data with AI-powered recommendations
      </p>
    </div>
    
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Live Input Data Display */}
      {liveData && (
        <div className="backdrop-blur-md bg-slate-800/40 rounded-3xl p-6 border border-white/20 shadow-2xl">
          <h3 className="text-xl font-bold mb-4 text-center bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Current Delhi Environmental Data 
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">AQI</label>
              <p className="text-lg font-semibold text-white">{liveData.aqi}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">PM2.5</label>
              <p className="text-lg font-semibold text-white">{liveData.pm25.toFixed(1)}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">PM10</label>
              <p className="text-lg font-semibold text-white">{liveData.pm10.toFixed(1)}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">NO2</label>
              <p className="text-lg font-semibold text-white">{liveData.no2.toFixed(1)}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">SO2</label>
              <p className="text-lg font-semibold text-white">{liveData.so2.toFixed(1)}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">CO</label>
              <p className="text-lg font-semibold text-white">{(liveData.co / 1000).toFixed(3)}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">O3</label>
              <p className="text-lg font-semibold text-white">{liveData.o3.toFixed(1)}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">Weather</label>
              <p className="text-lg font-semibold text-white">{liveData.Weather}</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">Temp</label>
              <p className="text-lg font-semibold text-white">{liveData.temperature.toFixed(1)}°C</p>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide block">Humidity</label>
              <p className="text-lg font-semibold text-white">{liveData.humidity}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Recommendations */}
      <div className="backdrop-blur-md bg-slate-800/40 rounded-3xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI-Generated Recommendations
        </h3>
        {isFetchingLive ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-pulse mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mx-auto flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              </div>
              <p className="text-gray-400 text-lg">AI is analyzing live data...</p>
            </div>
          </div>
        ) : liveRecommendations.length > 0 ? (
          <div className="space-y-4">
            {liveRecommendations.map((rec, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)} transition-all duration-300 hover:scale-105`}
              >
                <h4 className="font-semibold mb-2 flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                  <span>{rec.title}</span>
                </h4>
                <p className="text-sm opacity-90">{rec.description}</p>
              </div>
            ))}
            <div className="mt-4 p-3 bg-slate-600/30 rounded-lg text-center">
              <p className="text-xs text-gray-400">
                Data updates every 5 minutes • Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-400 text-lg">No live recommendations available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
</section>



      {/* Footer */}
      <footer id="contact" className="py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Wind className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SkyPulse AI
              </span>
            </div>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Building a cleaner future with AI-powered environmental solutions
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <Github className="w-6 h-6" />
              </a>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-gray-500 text-sm">© 2025 SkyPulse AI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AirSenseAI