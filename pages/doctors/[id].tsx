import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Star, MapPin, Phone, Mail, DollarSign, Award, Clock, ThumbsUp, User } from 'lucide-react'

interface Doctor {
  id: string
  name: string
  specialization: string
  email: string
  phone: string
  experience: number
  location: string
  address: string
  city: string
  state: string
  rating: number
  reviewCount: number
  consultationFee: number
}

interface Review {
  id: string
  rating: number
  comment: string
  professionalism: number | null
  waitTime: number | null
  bedsidemanner: number | null
  helpfulCount: number
  createdAt: string
  user: {
    name: string
  }
}

export default function DoctorProfile() {
  const { data: session } = useSession()
  const router = useRouter()
  const { id } = router.query

  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)

  // Review form state
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [professionalism, setProfessionalism] = useState(5)
  const [waitTime, setWaitTime] = useState(5)
  const [bedsidemanner, setBedsidemanner] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (id) {
      fetchDoctorData()
      fetchReviews()
    }
  }, [id])

  const fetchDoctorData = async () => {
    try {
      const response = await fetch(`/api/doctors/search?id=${id}`)
      const data = await response.json()
      if (response.ok && data.doctors && data.doctors.length > 0) {
        setDoctor(data.doctors[0])
      }
    } catch (error) {
      console.error('Error fetching doctor:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?doctorId=${id}`)
      const data = await response.json()
      if (response.ok) {
        setReviews(data.reviews)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: id,
          rating,
          comment,
          professionalism,
          waitTime,
          bedsidemanner
        })
      })

      const data = await response.json()

      if (response.ok) {
        setShowReviewForm(false)
        setComment('')
        fetchReviews()
        fetchDoctorData() // Refresh to get updated rating
      } else {
        setSubmitError(data.message || 'Failed to submit review')
      }
    } catch (error) {
      setSubmitError('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST'
      })
      fetchReviews() // Refresh reviews to show updated count
    } catch (error) {
      console.error('Error marking review as helpful:', error)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  const renderInteractiveStars = (currentRating: number, setRating: (r: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={24}
            onClick={() => setRating(star)}
            className={`cursor-pointer transition-colors ${
              star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!doctor) {
    return <div className="flex items-center justify-center min-h-screen">Doctor not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Doctor Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={48} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dr. {doctor.name}</h1>
                <p className="text-xl text-blue-600 mt-1">{doctor.specialization}</p>
                <div className="flex items-center space-x-4 mt-3">
                  {renderStars(doctor.rating || 0)}
                  <span className="text-gray-600">
                    {doctor.rating?.toFixed(1)} ({doctor.reviewCount} reviews)
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-2 text-gray-600">
                  <Award size={18} />
                  <span>{doctor.experience} years experience</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/appointments/new?doctorId=${doctor.id}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Book Appointment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="flex items-center space-x-3">
              <MapPin className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">{doctor.city}, {doctor.state}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{doctor.phone}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{doctor.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Consultation Fee</p>
                <p className="font-medium">${doctor.consultationFee}</p>
              </div>
            </div>
          </div>

          {doctor.address && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">Full Address</p>
              <p className="text-gray-900 mt-1">{doctor.address}</p>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Patient Reviews</h2>
            {session && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="mb-8 p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Write Your Review</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Rating *
                  </label>
                  {renderInteractiveStars(rating, setRating)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professionalism
                    </label>
                    {renderInteractiveStars(professionalism, setProfessionalism)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wait Time
                    </label>
                    {renderInteractiveStars(waitTime, setWaitTime)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bedside Manner
                    </label>
                    {renderInteractiveStars(bedsidemanner, setBedsidemanner)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review (Optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share your experience..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{submitError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{review.user.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>

                  {(review.professionalism || review.waitTime || review.bedsidemanner) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {review.professionalism && (
                        <div>
                          <span className="text-gray-600">Professionalism:</span> {review.professionalism}/5
                        </div>
                      )}
                      {review.waitTime && (
                        <div>
                          <span className="text-gray-600">Wait Time:</span> {review.waitTime}/5
                        </div>
                      )}
                      {review.bedsidemanner && (
                        <div>
                          <span className="text-gray-600">Bedside Manner:</span> {review.bedsidemanner}/5
                        </div>
                      )}
                    </div>
                  )}

                  {review.comment && (
                    <p className="mt-3 text-gray-700">{review.comment}</p>
                  )}

                  <button
                    onClick={() => handleMarkHelpful(review.id)}
                    className="mt-3 flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600"
                  >
                    <ThumbsUp size={16} />
                    <span>Helpful ({review.helpfulCount})</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
