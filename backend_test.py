#!/usr/bin/env python3
"""
Backend API Testing for Next.js E-commerce Application
Tests all API endpoints mentioned in the review request
"""
import requests
import json
import sys
from datetime import datetime

class ECommerceAPITester:
    def __init__(self, base_url="https://commerce-ui-polish.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_result(self, test_name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"\n{status} - {test_name}")
        
        if success:
            self.tests_passed += 1
            if response_data and isinstance(response_data, (dict, list)):
                if isinstance(response_data, list):
                    print(f"   Response: Array with {len(response_data)} items")
                elif isinstance(response_data, dict):
                    print(f"   Response keys: {list(response_data.keys())[:5]}")  # Show first 5 keys
        else:
            self.failed_tests.append(test_name)
            if error:
                print(f"   Error: {error}")
            if response_data:
                print(f"   Response: {response_data}")

    def test_get_request(self, endpoint, test_name, expected_keys=None, min_items=None):
        """Generic GET request tester"""
        try:
            url = f"{self.base_url}/api{endpoint}"
            print(f"\n🔍 Testing {test_name}...")
            print(f"   URL: {url}")
            
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check for expected keys if provided
                    if expected_keys and isinstance(data, dict):
                        missing_keys = [key for key in expected_keys if key not in data]
                        if missing_keys:
                            self.log_result(test_name, False, data, f"Missing keys: {missing_keys}")
                            return False
                    
                    # Check minimum items if provided
                    if min_items is not None:
                        if isinstance(data, list) and len(data) < min_items:
                            self.log_result(test_name, False, data, f"Expected at least {min_items} items, got {len(data)}")
                            return False
                        elif isinstance(data, dict) and 'products' in data and len(data['products']) < min_items:
                            self.log_result(test_name, False, data, f"Expected at least {min_items} products, got {len(data['products'])}")
                            return False
                    
                    self.log_result(test_name, True, data)
                    return data
                    
                except json.JSONDecodeError:
                    self.log_result(test_name, False, response.text, "Invalid JSON response")
                    return False
            else:
                self.log_result(test_name, False, response.text, f"Status code: {response.status_code}")
                return False
                
        except requests.RequestException as e:
            self.log_result(test_name, False, None, str(e))
            return False

    def test_notification_subscribe(self):
        """Test the notification subscription endpoint"""
        try:
            url = f"{self.base_url}/api/notifications/subscribe"
            test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
            
            print(f"\n🔍 Testing Notification Subscription...")
            print(f"   URL: {url}")
            print(f"   Test Email: {test_email}")
            
            response = requests.post(url, 
                json={"email": test_email},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success"):
                        self.log_result("Notification Subscribe API", True, data)
                        return True
                    else:
                        self.log_result("Notification Subscribe API", False, data, "Success field is false")
                        return False
                except json.JSONDecodeError:
                    self.log_result("Notification Subscribe API", False, response.text, "Invalid JSON response")
                    return False
            else:
                self.log_result("Notification Subscribe API", False, response.text, f"Status code: {response.status_code}")
                return False
                
        except requests.RequestException as e:
            self.log_result("Notification Subscribe API", False, None, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting E-commerce API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)
        
        # Test Categories API
        categories = self.test_get_request("/categories", "Categories API", min_items=1)
        
        # Test Products API  
        products = self.test_get_request("/products", "Products API", expected_keys=["products", "total"])
        
        # Test specific product - ramlogo
        ramlogo_product = self.test_get_request("/products/ramlogo", "Product ramlogo API")
        
        # Test category page products (using UUID from review request)
        category_products = self.test_get_request(
            "/products?category=c8d4009f-e7be-46b4-b84a-d1c79d923570", 
            "Category Products API (تصاميم رمضان)"
        )
        
        # Test settings API
        settings = self.test_get_request("/settings", "Settings API")
        
        # Test featured products
        featured = self.test_get_request("/products?featured=true", "Featured Products API")
        
        # Test search functionality
        search_results = self.test_get_request("/products?search=ramlogo", "Search API")
        
        # Test notification subscription endpoint (NEW)
        notification_result = self.test_notification_subscribe()
        
        # Print summary
        self.print_summary()
        
        return {
            "categories": categories,
            "products": products, 
            "ramlogo_product": ramlogo_product,
            "category_products": category_products,
            "settings": settings,
            "featured": featured,
            "search_results": search_results,
            "notification_result": notification_result
        }
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed} ✅")
        print(f"Failed: {len(self.failed_tests)} ❌")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        print("\n" + "=" * 50)

def main():
    """Main test execution"""
    tester = ECommerceAPITester()
    
    try:
        results = tester.run_all_tests()
        
        # Additional validation
        print("\n🔍 Additional Validation:")
        
        # Check if ramlogo has YouTube video
        if results.get("ramlogo_product"):
            product = results["ramlogo_product"]
            if "youtubeUrl" in product and product["youtubeUrl"]:
                print("✅ ramlogo product has YouTube video")
            else:
                print("⚠️  ramlogo product missing YouTube video")
                
            # Check customizations
            if "customizations" in product:
                customizations = product["customizations"]
                logo_upload = customizations.get("logoUpload", {}).get("enabled", False)
                colors = customizations.get("primaryColor", {}).get("enabled", False) or customizations.get("secondaryColor", {}).get("enabled", False)
                
                if logo_upload:
                    print("✅ ramlogo has logo upload customization")
                else:
                    print("⚠️  ramlogo missing logo upload customization")
                    
                if colors:
                    print("✅ ramlogo has color customizations")
                else:
                    print("⚠️  ramlogo missing color customizations")
        
        # Check categories structure
        if results.get("categories"):
            categories = results["categories"]
            if any(cat.get("id") == "c8d4009f-e7be-46b4-b84a-d1c79d923570" for cat in categories):
                print("✅ Target category ID found in categories")
            else:
                print("⚠️  Target category ID not found")
        
        return 0 if tester.tests_passed == tester.tests_run else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())